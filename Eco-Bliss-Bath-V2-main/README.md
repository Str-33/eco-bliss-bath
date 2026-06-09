# Eco-Bliss-Bath — Tests automatisés Cypress

Projet OpenClassrooms — Campagne de tests sur l'application Eco-Bliss-Bath.

---

## Prérequis

Installez ces outils avant de commencer :

- [Docker Desktop](https://www.docker.com/products/docker-desktop/)
- [Node.js](https://nodejs.org/) v16 ou supérieur
- npm (inclus avec Node.js)

---

## Installation du projet

### 1. Cloner le dépôt

```bash
git clone https://github.com/OpenClassrooms-Student-Center/Eco-Bliss-Bath-V2.git
cd Eco-Bliss-Bath-V2
```

### 2. Démarrer l'API et la base de données

```bash
docker compose up -d
```

L'API sera disponible sur `http://localhost:8081`.

### 3. Installer les dépendances frontend

```bash
cd frontend
npm install
```

### 4. Démarrer le frontend Angular

```bash
npm start
```

Le frontend sera disponible sur `http://localhost:4200`.

---

## Exécution des tests Cypress

> Le frontend (`npm start`) et l'API (`docker compose up -d`) doivent être démarrés avant de lancer les tests.

### Mode interactif (interface graphique)

```bash
cd frontend
npx cypress open
```

Sélectionnez **E2E Testing**, choisissez un navigateur, puis lancez les tests.

### Mode headless (ligne de commande)

```bash
cd frontend
npx cypress run
```

### Lancer un fichier de test spécifique

```bash
npx cypress run --spec "cypress/e2e/login.cy.ts"
npx cypress run --spec "cypress/e2e/validation-panier.cy.ts"
npx cypress run --spec "cypress/e2e/api.cy.ts"
npx cypress run --spec "cypress/e2e/smoke.cy.ts"
```

---

## Description des fichiers de tests

| Fichier | Périmètre testé |
|---|---|
| `smoke.cy.ts` | Chargement des pages, navigation, sécurité XSS |
| `login.cy.ts` | Connexion réussie, échec 401, validation des champs, état de chargement |
| `api.cy.ts` | Endpoints API : login, avis, produits, commandes, profil |
| `validation-panier.cy.ts` | Sélection produit, ajout au panier, limites de quantité, validation du formulaire |

---

## Génération du rapport de tests

### 1. Installer Mochawesome

```bash
cd frontend
npm install --save-dev mochawesome mochawesome-merge mochawesome-report-generator
```

### 2. Lancer les tests avec génération du rapport JSON

```bash
npx cypress run --reporter mochawesome --reporter-options reportDir=cypress/reports,overwrite=false,html=false,json=true
```

### 3. Fusionner les fichiers JSON

```bash
npx mochawesome-merge cypress/reports/*.json -o cypress/reports/report.json
```

### 4. Générer le rapport HTML

```bash
npx marge cypress/reports/report.json -f report -o cypress/reports
```

Le rapport est disponible dans `frontend/cypress/reports/report.html`.

---

## Anomalies détectées

### Anomalie 1 — GET /me retourne 500 au lieu de 401

**Gravité :** Moyenne

**Description :** L'endpoint `GET /me` retourne une erreur serveur (500) quand aucun token n'est fourni. Le comportement attendu est un code 401 Unauthorized.

**Étapes pour reproduire :**

1. Démarrer l'API.
2. Envoyer une requête `GET http://localhost:8081/me` sans header `Authorization`.
3. Observer que le serveur retourne 500 au lieu de 401.

**Script concerné :** `cypress/e2e/api.cy.ts` — section `GET /me`

**Correction attendue :** Le backend doit rejeter les requêtes sans token avec un 401 avant d'exécuter la logique métier.

---

### Anomalie 2 — Produit avec stock négatif peut être commandé

**Gravité :** Haute

**Description :** Le produit n°3 a un stock de -8. L'API accepte une commande pour ce produit au lieu de la rejeter.

**Étapes pour reproduire :**

1. Se connecter avec `test2@test.fr` / `testtest`.
2. Accéder à `http://localhost:4200/#/products/3`.
3. Ajouter 1 unité au panier.
4. Observer que l'API accepte la commande (status 2xx).

**Script concerné :** `cypress/e2e/validation-panier.cy.ts` — section `Validation du stock disponible`

**Correction attendue :** L'API doit vérifier que le stock est strictement positif avant d'accepter toute commande.

---

### Anomalie 3 — Produit en rupture de stock peut être commandé

**Gravité :** Haute

**Description :** Le produit n°4 a un stock de 0. L'API accepte une commande au lieu de la rejeter.

**Étapes pour reproduire :**

1. Se connecter avec `test2@test.fr` / `testtest`.
2. Accéder à `http://localhost:4200/#/products/4`.
3. Ajouter 1 unité au panier.
4. Observer que l'API accepte la commande au lieu de retourner une erreur.

**Script concerné :** `cypress/e2e/validation-panier.cy.ts` — section `Validation du stock disponible`

**Correction attendue :** L'API doit rejeter toute commande si le stock est égal à zéro.

---

### Anomalie 4 — Aucun message d'erreur affiché quand l'ajout au panier échoue

**Gravité :** Faible

**Description :** Quand l'API rejette un ajout au panier (ex. : quantité supérieure au stock), le frontend n'affiche aucun retour à l'utilisateur. L'action échoue en silence.

**Étapes pour reproduire :**

1. Se connecter.
2. Accéder au produit n°7 (stock = 4).
3. Saisir une quantité de 10 et cliquer sur "Ajouter au panier".
4. Observer qu'aucun message d'erreur n'apparaît.

**Script concerné :** `cypress/e2e/validation-panier.cy.ts` — section `Validation du stock disponible`

**Correction attendue :** Le composant `product.component.ts` doit intercepter les erreurs API autres que 401 et afficher un message explicite à l'utilisateur.

---

## Comptes de test

| Email | Mot de passe | Rôle |
|---|---|---|
| `test2@test.fr` | `testtest` | Utilisateur standard |
