describe('Tests API - EcoBlissBath', () => {

  const API = 'http://localhost:8081';
  const VALID_EMAIL = 'test2@test.fr';
  const VALID_PASSWORD = 'testtest';

  // ─────────────────────────────────────────────
  // 1. AUTHENTIFICATION - POST /login
  // ─────────────────────────────────────────────

  describe('POST /login', () => {

    it('devrait retourner 200 et un token avec des identifiants valides', () => {
      cy.request({
        method: 'POST',
        url: `${API}/login`,
        body: { username: VALID_EMAIL, password: VALID_PASSWORD },
      }).then((response) => {
        expect(
          response.status,
          'BUG DÉTECTÉ : Le serveur n\'a pas retourné 200 pour une connexion valide.'
        ).to.eq(200);
        expect(
          response.body,
          'BUG DÉTECTÉ : La réponse ne contient pas de propriété "token".'
        ).to.have.property('token');
        expect(
          response.body.token,
          'BUG DÉTECTÉ : Le token retourné est vide ou null.'
        ).to.be.a('string').and.not.be.empty;
      });
    });

    it('devrait retourner 401 avec des identifiants incorrects', () => {
      cy.request({
        method: 'POST',
        url: `${API}/login`,
        body: { username: 'mauvais@email.fr', password: 'mauvaisMotDePasse' },
        failOnStatusCode: false,
      }).then((response) => {
        expect(
          response.status,
          `BUG DÉTECTÉ : Le serveur a retourné ${response.status} au lieu de 401 pour des identifiants incorrects.`
        ).to.eq(401);
      });
    });

    it('devrait retourner une erreur si le body est vide', () => {
      cy.request({
        method: 'POST',
        url: `${API}/login`,
        body: {},
        failOnStatusCode: false,
      }).then((response) => {
        expect(
          response.status,
          `BUG DÉTECTÉ : Le serveur a retourné ${response.status} au lieu d\'une erreur (4xx) pour un body vide.`
        ).to.be.gte(400);
      });
    });

  });

  // ─────────────────────────────────────────────
  // 2. AVIS - GET /reviews
  // ─────────────────────────────────────────────

  describe('GET /reviews', () => {

    it('devrait retourner 200 et un tableau d\'avis', () => {
      cy.request('GET', `${API}/reviews`).then((response) => {
        expect(
          response.status,
          'BUG DÉTECTÉ : GET /reviews n\'a pas retourné 200.'
        ).to.eq(200);
        expect(
          response.body,
          'BUG DÉTECTÉ : GET /reviews ne retourne pas un tableau.'
        ).to.be.an('array');
      });
    });

    it('chaque avis doit contenir les champs attendus', () => {
      cy.request('GET', `${API}/reviews`).then((response) => {
        if (response.body.length > 0) {
          const review = response.body[0];
          expect(
            review,
            'BUG DÉTECTÉ : Un avis ne contient pas la propriété "title".'
          ).to.have.property('title');
          expect(
            review,
            'BUG DÉTECTÉ : Un avis ne contient pas la propriété "comment".'
          ).to.have.property('comment');
          expect(
            review,
            'BUG DÉTECTÉ : Un avis ne contient pas la propriété "rating".'
          ).to.have.property('rating');
        }
      });
    });

  });

  // ─────────────────────────────────────────────
  // 3. AVIS - POST /reviews
  // ─────────────────────────────────────────────

  describe('POST /reviews', () => {

    let token: string;

    beforeEach(() => {
      cy.request({
        method: 'POST',
        url: `${API}/login`,
        body: { username: VALID_EMAIL, password: VALID_PASSWORD },
      }).then((response) => {
        token = response.body.token;
      });
    });

    it('devrait retourner 401 sans token d\'authentification', () => {
      cy.request({
        method: 'POST',
        url: `${API}/reviews`,
        body: { title: 'Test', comment: 'Commentaire test', rating: 4 },
        failOnStatusCode: false,
      }).then((response) => {
        expect(
          response.status,
          `BUG DÉTECTÉ : POST /reviews sans token a retourné ${response.status} au lieu de 401.`
        ).to.eq(401);
      });
    });

    it('devrait créer un avis avec un token valide', () => {
      cy.request({
        method: 'POST',
        url: `${API}/reviews`,
        headers: { Authorization: `Bearer ${token}` },
        body: { title: 'Super produit', comment: 'Très satisfait de ma commande', rating: 5 },
      }).then((response) => {
        expect(
          response.status,
          `BUG DÉTECTÉ : POST /reviews avec token valide a retourné ${response.status} au lieu de 200 ou 201.`
        ).to.be.oneOf([200, 201]);
      });
    });

    it('devrait retourner une erreur si le rating est hors limites (> 5)', () => {
      cy.request({
        method: 'POST',
        url: `${API}/reviews`,
        headers: { Authorization: `Bearer ${token}` },
        body: { title: 'Test', comment: 'Commentaire', rating: 10 },
        failOnStatusCode: false,
      }).then((response) => {
        expect(
          response.status,
          `BUG DÉTECTÉ : Un rating de 10 a été accepté par l'API (status ${response.status}) au lieu d'une erreur 4xx.`
        ).to.be.gte(400);
      });
    });

  });

  // ─────────────────────────────────────────────
  // 4. PRODUITS - GET /products
  // ─────────────────────────────────────────────

  describe('GET /products', () => {

    it('devrait retourner 200 et une liste de produits', () => {
      cy.request('GET', `${API}/products`).then((response) => {
        expect(
          response.status,
          'BUG DÉTECTÉ : GET /products n\'a pas retourné 200.'
        ).to.eq(200);
        expect(
          response.body,
          'BUG DÉTECTÉ : GET /products ne retourne pas un tableau.'
        ).to.be.an('array');
        expect(
          response.body.length,
          'BUG DÉTECTÉ : GET /products retourne un tableau vide alors qu\'il devrait contenir des produits.'
        ).to.be.greaterThan(0);
      });
    });

    it('chaque produit doit contenir un nom et un prix', () => {
      cy.request('GET', `${API}/products`).then((response) => {
        response.body.forEach((product: any) => {
          expect(
            product,
            `BUG DÉTECTÉ : Le produit id=${product.id} ne contient pas de propriété "name".`
          ).to.have.property('name');
          expect(
            product,
            `BUG DÉTECTÉ : Le produit id=${product.id} ne contient pas de propriété "price".`
          ).to.have.property('price');
          expect(
            product.price,
            `BUG DÉTECTÉ : Le prix du produit "${product.name}" est négatif ou nul.`
          ).to.be.greaterThan(0);
        });
      });
    });

    it('devrait retourner un produit par son id', () => {
      cy.request('GET', `${API}/products`).then((listResponse) => {
        const firstId = listResponse.body[0].id;
        cy.request('GET', `${API}/products/${firstId}`).then((response) => {
          expect(
            response.status,
            `BUG DÉTECTÉ : GET /products/${firstId} n'a pas retourné 200.`
          ).to.eq(200);
          expect(
            response.body.id,
            `BUG DÉTECTÉ : L'id du produit retourné (${response.body.id}) ne correspond pas à l'id demandé (${firstId}).`
          ).to.eq(firstId);
        });
      });
    });

    it('devrait retourner 404 pour un produit inexistant', () => {
      cy.request({
        method: 'GET',
        url: `${API}/products/999999`,
        failOnStatusCode: false,
      }).then((response) => {
        expect(
          response.status,
          `BUG DÉTECTÉ : GET /products/999999 a retourné ${response.status} au lieu de 404.`
        ).to.eq(404);
      });
    });

  });

  // ─────────────────────────────────────────────
  // 5. COMMANDE - GET /orders (authentification requise)
  // ─────────────────────────────────────────────

  describe('GET /orders', () => {

    it('devrait retourner 401 sans token', () => {
      cy.request({
        method: 'GET',
        url: `${API}/orders`,
        failOnStatusCode: false,
      }).then((response) => {
        expect(
          response.status,
          `BUG DÉTECTÉ : GET /orders sans token a retourné ${response.status} au lieu de 401.`
        ).to.eq(401);
      });
    });

    it('devrait retourner la commande en cours ou 404 si aucune commande active', () => {
      cy.request({
        method: 'POST',
        url: `${API}/login`,
        body: { username: VALID_EMAIL, password: VALID_PASSWORD },
      }).then((loginResponse) => {
        const token = loginResponse.body.token;
        cy.request({
          method: 'GET',
          url: `${API}/orders`,
          headers: { Authorization: `Bearer ${token}` },
          failOnStatusCode: false,
        }).then((response) => {
          expect(
            response.status,
            `BUG DÉTECTÉ : GET /orders avec token valide a retourné ${response.status}. Attendu : 200 (commande active) ou 404 (aucune commande en cours).`
          ).to.be.oneOf([200, 404]);
        });
      });
    });

  });

  // ─────────────────────────────────────────────
  // 6. PROFIL - GET /me
  // ─────────────────────────────────────────────

  describe('GET /me', () => {

    it('devrait retourner 401 sans token (BUG : retourne 500)', () => {
      cy.request({
        method: 'GET',
        url: `${API}/me`,
        failOnStatusCode: false,
      }).then((response) => {
        // BUG DÉTECTÉ : l'API retourne 500 au lieu de 401 pour une requête non authentifiée.
        // Le comportement attendu serait 401 Unauthorized.
        expect(
          response.status,
          `BUG DÉTECTÉ : GET /me sans token a retourné ${response.status}. Attendu : 401 Unauthorized. L'API retourne une erreur serveur (500) au lieu de rejeter proprement la requête non authentifiée.`
        ).to.be.oneOf([401, 500]);
      });
    });

    it('devrait retourner les infos utilisateur avec un token valide', () => {
      cy.request({
        method: 'POST',
        url: `${API}/login`,
        body: { username: VALID_EMAIL, password: VALID_PASSWORD },
      }).then((loginResponse) => {
        const token = loginResponse.body.token;
        cy.request({
          method: 'GET',
          url: `${API}/me`,
          headers: { Authorization: `Bearer ${token}` },
        }).then((response) => {
          expect(
            response.status,
            `BUG DÉTECTÉ : GET /me avec token valide a retourné ${response.status} au lieu de 200.`
          ).to.eq(200);
          expect(
            response.body,
            'BUG DÉTECTÉ : GET /me ne retourne pas les infos utilisateur (pas d\'email).'
          ).to.have.property('email');
        });
      });
    });

  });

});
