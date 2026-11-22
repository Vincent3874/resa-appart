import { lazy, Suspense, useCallback, useEffect, useMemo, useState } from 'react'
import { useAuth } from '../auth/AuthContext'
import EntreeForm, { type ChampsEntreeSaisie } from '../components/EntreeForm'

// recharts (~400 kB) n'est chargé que sur cette page, en chunk séparé :
// le bundle principal reste sous la limite d'avertissement de vite.
const GraphiquesCompta = lazy(() => import('../components/GraphiquesCompta'))
import {
  afficherDateComplete,
  afficherMontant,
  chargerAdmins,
  chargerCategories,
  chargerEntrees,
  chargerEstAdmin,
  chargerPostesAnnee,
  chargerSoldesAnnuels,
  creerEntree,
  messageErreurCompta,
  modifierEntree,
  supprimerEntree,
  type CategorieCompta,
  type ChampsEntree,
  type EntreeCompta,
  type PosteAnnee,
  type RepartitionAnnee,
  type SoldeAnnuel,
} from '../lib/comptabilite'
import { afficherLongue, chargerProfils, versInputDate, type Profil } from '../lib/reservations'

interface EtatFormulaire {
  mode: 'creation' | 'edition'
  entree?: EntreeCompta
  initial: ChampsEntreeSaisie
}

const texteCompte = (n: number, total: number): string => {
  const mot = n > 1 ? 'écritures' : 'écriture'
  return n === total ? `${n} ${mot}` : `${n} ${mot} sur ${total}`
}

export default function Comptabilite() {
  const { session } = useAuth()
  const [estAdmin, setEstAdmin] = useState<boolean | null>(null)
  const [refus, setRefus] = useState(false)
  const [entrees, setEntrees] = useState<EntreeCompta[] | null>(null)
  const [categories, setCategories] = useState<CategorieCompta[]>([])
  const [soldes, setSoldes] = useState<SoldeAnnuel[]>([])
  const [postes, setPostes] = useState<PosteAnnee[]>([])
  const [profils, setProfils] = useState<Profil[]>([])
  const [admins, setAdmins] = useState<Profil[]>([])
  const [filtreAnnee, setFiltreAnnee] = useState('toutes')
  const [filtreCategorie, setFiltreCategorie] = useState('toutes')
  const [anneePoste, setAnneePoste] = useState<number | null>(null)
  const [formulaire, setFormulaire] = useState<EtatFormulaire | null>(null)
  const [erreur, setErreur] = useState('')
  const [info, setInfo] = useState('')
  const [enCours, setEnCours] = useState(false)

  const utilisateur = session?.user.id ?? ''

  const recharger = useCallback(async () => {
    try {
      const [e, c, s, p, pro, adm] = await Promise.all([
        chargerEntrees(),
        chargerCategories(),
        chargerSoldesAnnuels(),
        chargerPostesAnnee(),
        chargerProfils(),
        chargerAdmins(),
      ])
      setEntrees(e)
      setCategories(c)
      setSoldes(s)
      setPostes(p)
      setProfils(pro)
      setAdmins(adm)
      setRefus(false)
      return true
    } catch (e) {
      const code = (e as { code?: string })?.code ?? ''
      // Un non-admin qui force l'URL reçoit un refus RLS (42501) : on affiche
      // le message réservé plutôt qu'une erreur technique.
      if (code === '42501') {
        setRefus(true)
        setEntrees([])
      } else if (code === '42703') {
        // Colonne inconnue : la migration 001 n'est pas encore appliquée.
        setErreur(messageErreurCompta(e))
      } else {
        setErreur('Impossible de charger la comptabilité. Recharge la page et réessaie.')
      }
      return false
    }
  }, [])

  // L'affichage de l'onglet dépend de profiles.is_admin ; la RLS reste le
  // contrôle réel côté serveur.
  useEffect(() => {
    if (!session) return
    let actif = true
    chargerEstAdmin(session.user.id).then((admin) => {
      if (!actif) return
      setEstAdmin(admin)
      if (admin) recharger()
    })
    return () => {
      actif = false
    }
  }, [session, recharger])

  const annees = useMemo(() => {
    const brut = new Set((entrees ?? []).map((e) => e.entry_date.slice(0, 4)))
    return Array.from(brut).sort((a, b) => b.localeCompare(a))
  }, [entrees])

  const anneesPostes = useMemo(() => {
    const brut = new Set(postes.map((p) => Number(p.annee)))
    return Array.from(brut).sort((a, b) => b - a)
  }, [postes])

  const anneePosteEffective = anneePoste ?? anneesPostes[0] ?? new Date().getFullYear()

  // Répartition des règlements par membre et par année : qui a payé (coûts) ou
  // reçu (recettes) combien, pour équilibrer les comptes en fin d'année.
  const repartition = useMemo<RepartitionAnnee[]>(() => {
    const parCle = new Map<string, { annee: number; membreId: string; membre: string; paye: number; recu: number }>()
    for (const e of entrees ?? []) {
      if (!e.regle_par) continue
      const annee = Number(e.entry_date.slice(0, 4))
      const cat = categories.find((c) => c.id === e.category_id)
      const membre = profils.find((p) => p.id === e.regle_par)?.display_name ?? 'un membre'
      const cle = `${annee}|${e.regle_par}`
      const ligne = parCle.get(cle) ?? { annee, membreId: e.regle_par, membre, paye: 0, recu: 0 }
      if (cat?.direction === 'recette') ligne.recu += Number(e.amount)
      else ligne.paye += Number(e.amount)
      parCle.set(cle, ligne)
    }
    const parAnnee = new Map<number, { membre: string; paye: number; recu: number }[]>()
    for (const l of parCle.values()) {
      const liste = parAnnee.get(l.annee) ?? []
      liste.push({ membre: l.membre, paye: l.paye, recu: l.recu })
      parAnnee.set(l.annee, liste)
    }
    return Array.from(parAnnee.entries())
      .map(([annee, lignes]) => ({
        annee,
        lignes: lignes.sort((a, b) => b.paye + b.recu - (a.paye + a.recu)),
      }))
      .sort((a, b) => b.annee - a.annee)
  }, [entrees, categories, profils])

  const filtrees = useMemo(() => {
    if (!entrees) return []
    return entrees.filter((e) => {
      if (filtreAnnee !== 'toutes' && e.entry_date.slice(0, 4) !== filtreAnnee) return false
      if (filtreCategorie !== 'toutes' && e.category_id !== Number(filtreCategorie)) return false
      return true
    })
  }, [entrees, filtreAnnee, filtreCategorie])

  const nomAuteur = (e: EntreeCompta): string =>
    profils.find((p) => p.id === e.created_by)?.display_name ?? 'un administrateur'

  const nomModifieur = (e: EntreeCompta): string | null =>
    e.updated_by ? profils.find((p) => p.id === e.updated_by)?.display_name ?? 'un administrateur' : null

  const metaEntree = (e: EntreeCompta): string => {
    const creee = `Saisie par ${nomAuteur(e)} le ${afficherLongue(e.created_at)}`
    const modifieur = nomModifieur(e)
    if (modifieur) return `${creee} · modifiée par ${modifieur} le ${afficherLongue(e.updated_at)}`
    return creee
  }

  const reinitialiserFiltres = () => {
    setFiltreAnnee('toutes')
    setFiltreCategorie('toutes')
  }

  const boutonNouvelle = () => {
    setErreur('')
    setInfo('')
    const actives = categories.filter((c) => c.is_active)
    setFormulaire({
      mode: 'creation',
      initial: {
        category_id: actives[0]?.id ?? 0,
        amount: '',
        entry_date: versInputDate(new Date()),
        label: '',
        comment: '',
        regle_par: '',
        date_reglement: '',
      },
    })
  }

  const ouvrir = (e: EntreeCompta) => {
    setErreur('')
    setInfo('')
    setFormulaire({
      mode: 'edition',
      entree: e,
      initial: {
        category_id: e.category_id,
        amount: String(e.amount),
        entry_date: e.entry_date,
        label: e.label ?? '',
        comment: e.comment ?? '',
        regle_par: e.regle_par ?? '',
        date_reglement: e.date_reglement ?? '',
      },
    })
  }

  const valider = async (champs: ChampsEntree) => {
    setErreur('')
    setInfo('')
    if (!Number.isFinite(champs.amount) || champs.amount <= 0) {
      setErreur('Le montant doit être strictement positif.')
      return
    }
    setEnCours(true)
    try {
      if (formulaire?.mode === 'edition' && formulaire.entree) {
        await modifierEntree(formulaire.entree.id, champs, utilisateur)
      } else {
        await creerEntree({ ...champs, created_by: utilisateur })
      }
      setFormulaire(null)
      setInfo('Écriture enregistrée.')
      await recharger()
    } catch (e) {
      setErreur(messageErreurCompta(e))
    }
    setEnCours(false)
  }

  // La confirmation de suppression se fait dans le formulaire (bloc rouge),
  // sans fenetre native du navigateur.
  const supprimer = async () => {
    if (!formulaire?.entree) return
    setEnCours(true)
    setErreur('')
    try {
      await supprimerEntree(formulaire.entree.id)
      setFormulaire(null)
      setInfo('Écriture supprimée.')
      await recharger()
    } catch (e) {
      setErreur(messageErreurCompta(e))
    }
    setEnCours(false)
  }

  if (!session) return null

  if (estAdmin === false || refus) {
    return (
      <section className="module">
        <h2>Comptabilité</h2>
        <p className="a-venir">
          La comptabilité est réservée aux administrateurs. Si tu penses que c’est une erreur, contacte
          Vincent.
        </p>
      </section>
    )
  }

  return (
    <section className="module">
      <div className="planning-tete">
        <h2>Comptabilité</h2>
        {estAdmin === true && (
          <button className="btn principal" type="button" onClick={boutonNouvelle}>
            Nouvelle écriture
          </button>
        )}
      </div>

      {erreur && <p className="erreur">{erreur}</p>}
      {info && <p className="info">{info}</p>}

      {formulaire && estAdmin === true && (
        <EntreeForm
          key={formulaire.mode === 'edition' ? (formulaire.entree?.id ?? 'edition') : 'creation'}
          initial={formulaire.initial}
          categories={categories}
          admins={admins}
          enEdition={formulaire.mode === 'edition'}
          meta={formulaire.entree ? metaEntree(formulaire.entree) : undefined}
          enCours={enCours}
          onValide={valider}
          onSupprime={formulaire.mode === 'edition' ? supprimer : undefined}
          onAnnule={() => setFormulaire(null)}
        />
      )}

      {estAdmin !== true ? (
        <p className="a-venir">Chargement de la comptabilité…</p>
      ) : entrees === null ? (
        <p className="a-venir">Chargement de la comptabilité…</p>
      ) : (
        <>
          {soldes.length > 0 && (
            <Suspense fallback={<p className="a-venir">Chargement des graphiques…</p>}>
              <GraphiquesCompta
                soldes={soldes}
                postes={postes}
                annees={anneesPostes.length > 0 ? anneesPostes : annees.map(Number)}
                anneePoste={anneePosteEffective}
                onChangeAnnee={setAnneePoste}
                repartition={repartition}
              />
            </Suspense>
          )}

          <div className="filtres">
            <div className="champ">
              <label htmlFor="filtre-annee">Année</label>
              <select id="filtre-annee" value={filtreAnnee} onChange={(e) => setFiltreAnnee(e.target.value)}>
                <option value="toutes">Toutes les années</option>
                {annees.map((a) => (
                  <option key={a} value={a}>
                    {a}
                  </option>
                ))}
              </select>
            </div>
            <div className="champ">
              <label htmlFor="filtre-categorie">Poste</label>
              <select
                id="filtre-categorie"
                value={filtreCategorie}
                onChange={(e) => setFiltreCategorie(e.target.value)}
              >
                <option value="toutes">Tous les postes</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.label}
                  </option>
                ))}
              </select>
            </div>
            <button className="btn fantome" type="button" onClick={reinitialiserFiltres}>
              Réinitialiser les filtres
            </button>
            <span className="compteur">{texteCompte(filtrees.length, entrees.length)}</span>
          </div>

          {entrees.length === 0 ? (
            <p className="a-venir">
              Aucune écriture pour le moment. Crée la première avec « Nouvelle écriture ».
            </p>
          ) : filtrees.length === 0 ? (
            <p className="a-venir">Aucune écriture ne correspond aux filtres actuels.</p>
          ) : (
            <div className="tableau-defil">
              <table className="tableau-compta">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Poste</th>
                    <th>Montant</th>
                    <th>Libellé</th>
                    <th>Commentaire</th>
                    <th>Payé/reçu par</th>
                    <th>Date de règlement</th>
                    <th>Saisie par</th>
                  </tr>
                </thead>
                <tbody>
                  {filtrees.map((e) => {
                    const cat = categories.find((c) => c.id === e.category_id)
                    const recette = cat?.direction === 'recette'
                    return (
                      <tr key={e.id} onClick={() => ouvrir(e)}>
                        <td className="date">{afficherDateComplete(e.entry_date)}</td>
                        <td>
                          <span className={`badge-note ${recette ? 'badge-recette' : 'badge-depense'}`}>
                            {cat?.label ?? 'Poste inconnu'}
                          </span>
                        </td>
                        <td className={recette ? 'montant-recette' : 'montant-depense'}>
                          {recette ? '+' : '−'}
                          {afficherMontant(e.amount)}
                        </td>
                        <td>{e.label ?? ''}</td>
                        <td>{e.comment ?? ''}</td>
                        <td className="auteur">
                          {e.regle_par
                            ? profils.find((p) => p.id === e.regle_par)?.display_name ?? '—'
                            : ''}
                        </td>
                        <td className="date">
                          {e.date_reglement ? afficherDateComplete(e.date_reglement) : ''}
                        </td>
                        <td className="auteur">{nomAuteur(e)}</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}

      <p className="planning-aide">
        Clique sur une ligne du tableau pour consulter et modifier une écriture. Les montants saisis sont
        toujours positifs : le sens (coût ou recette) vient du poste choisi. Filtre le tableau par année et
        par poste au-dessus de la liste.
      </p>
    </section>
  )
}
