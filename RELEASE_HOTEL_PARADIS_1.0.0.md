# HospiCore 1.0.0 — Hôtel Paradis Lourdes

Date de gel fonctionnel : 8 août 2026
Statut : version de production candidate

## Périmètre actif

- Centre de Commandement
- Réception
  - Arrivées & départs
  - Fiches Groupe 360°
  - Contrôles Groupe à compléter
  - Demandes clients individuels
  - Fiche de fonction hebdomadaire
  - Feuille de route veilleur
  - Archives
- Commercial
- Planning opérationnel
- Salles de réunion
- Tâches
- Consignes
- Journal d’exploitation
- Centre des opérations
- Maintenance
- Diagnostic
- Administration

## Sécurité et utilisateurs

- Authentification par compte utilisateur
- Mots de passe hashés côté serveur
- Profils de base et profils personnalisés
- Droits individuels par utilisateur
- Suspension / réactivation de comptes
- Réinitialisation du mot de passe
- Menu utilisateur avec droits effectifs en lecture seule et déconnexion

## Données

- PostgreSQL est la source de vérité des espaces partagés
- `group-360` est la source de vérité des groupes
- Les anciens modules Restaurant, Cuisine et Housekeeping sont hors périmètre
- Les anciens caches et écrans legacy identifiés ont été retirés
- Aucun jeu de données d’exemple ne doit être préchargé dans une installation neuve

## Règle de mise en production

Le déploiement de référence doit utiliser le dernier commit de cette branche et les variables d’environnement de production, notamment `DATABASE_URL` et `JWT_SECRET`.

Après déploiement, effectuer un contrôle manuel de connexion, synchronisation PostgreSQL, permissions, création d’utilisateur, Groupe 360°, contrôle Groupe, maintenance, demandes individuelles et impression de la feuille de route veilleur.
