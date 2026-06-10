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

    it('devrait retourner 3 produits aléatoires via GET /products/random', () => {
      cy.request('GET', `${API}/products/random`).then((response) => {
        expect(
          response.status,
          'BUG DÉTECTÉ : GET /products/random n\'a pas retourné 200.'
        ).to.eq(200);
        expect(
          response.body,
          'BUG DÉTECTÉ : GET /products/random ne retourne pas un tableau.'
        ).to.be.an('array');
        expect(
          response.body.length,
          'BUG DÉTECTÉ : GET /products/random ne retourne pas exactement 3 produits.'
        ).to.eq(3);
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

    it('devrait retourner la liste des produits du panier avec un token valide', () => {
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

          if (response.status === 200) {
            expect(
              response.body,
              'BUG DÉTECTÉ : GET /orders ne retourne pas un objet commande.'
            ).to.be.an('object');
            expect(
              response.body,
              'BUG DÉTECTÉ : GET /orders ne contient pas la propriété "orderLines" (liste des produits du panier).'
            ).to.have.property('orderLines');
            expect(
              response.body.orderLines,
              'BUG DÉTECTÉ : La propriété "orderLines" n\'est pas un tableau.'
            ).to.be.an('array');
          }
        });
      });
    });

  });

  // ─────────────────────────────────────────────
  // 6. SANTÉ - GET /api/health
  // ─────────────────────────────────────────────

  describe('GET /api/health', () => {

    it('devrait retourner 200 et confirmer que l\'API est opérationnelle', () => {
      cy.request('GET', `${API}/api/health`).then((response) => {
        expect(
          response.status,
          'BUG DÉTECTÉ : GET /api/health n\'a pas retourné 200. L\'API est peut-être hors service.'
        ).to.eq(200);
      });
    });

  });

  // ─────────────────────────────────────────────
  // 7. PANIER - PUT /orders/add
  // ANOMALIE : L'endpoint utilise PUT au lieu de POST (convention REST).
  // Le frontend (product.component.ts) envoie également un PUT.
  // ─────────────────────────────────────────────

  describe('PUT /orders/add', () => {

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

    it('devrait ajouter un produit disponible au panier et retourner 200 (ANOMALIE : méthode PUT au lieu de POST)', () => {
      cy.request({
        method: 'PUT',
        url: `${API}/orders/add`,
        headers: { Authorization: `Bearer ${token}` },
        body: { product: 1, quantity: 1 },
        failOnStatusCode: false,
      }).then((response) => {
        expect(
          response.status,
          `BUG DÉTECTÉ : PUT /orders/add avec un produit disponible a retourné ${response.status} au lieu de 200. (Note : l'endpoint devrait être POST selon les conventions REST.)`
        ).to.eq(200);
      });
    });

    it('devrait retourner une erreur pour un produit en rupture de stock (produit 4, stock=0)', () => {
      cy.request({
        method: 'PUT',
        url: `${API}/orders/add`,
        headers: { Authorization: `Bearer ${token}` },
        body: { product: 4, quantity: 1 },
        failOnStatusCode: false,
      }).then((response) => {
        expect(
          response.status,
          `BUG DÉTECTÉ : PUT /orders/add avec un produit en rupture de stock (id=4, stock=0) a retourné ${response.status} au lieu d'une erreur 4xx.`
        ).to.be.gte(400);
      });
    });

  });

  // ─────────────────────────────────────────────
  // 8. COMMANDE - POST /orders (validation)
  // ─────────────────────────────────────────────

  describe('POST /orders', () => {

    it('devrait retourner 401 sans token', () => {
      cy.request({
        method: 'POST',
        url: `${API}/orders`,
        failOnStatusCode: false,
      }).then((response) => {
        expect(
          response.status,
          `BUG DÉTECTÉ : POST /orders sans token a retourné ${response.status} au lieu de 401.`
        ).to.eq(401);
      });
    });

    it('devrait valider la commande en cours avec un token valide', () => {
      cy.request({
        method: 'POST',
        url: `${API}/login`,
        body: { username: VALID_EMAIL, password: VALID_PASSWORD },
      }).then((loginResponse) => {
        const token = loginResponse.body.token;
        cy.request({
          method: 'POST',
          url: `${API}/orders`,
          headers: { Authorization: `Bearer ${token}` },
          failOnStatusCode: false,
        }).then((response) => {
          expect(
            response.status,
            `BUG DÉTECTÉ : POST /orders avec token valide a retourné ${response.status}. Attendu : 200 (commande validée) ou 400 (panier vide).`
          ).to.be.oneOf([200, 400]);
        });
      });
    });

  });

  // ─────────────────────────────────────────────
  // 9. PANIER - DELETE /orders/{id}/delete
  // ─────────────────────────────────────────────

  describe('DELETE /orders/{id}/delete', () => {

    it('devrait retourner 401 sans token', () => {
      cy.request({
        method: 'DELETE',
        url: `${API}/orders/1/delete`,
        failOnStatusCode: false,
      }).then((response) => {
        expect(
          response.status,
          `BUG DÉTECTÉ : DELETE /orders/1/delete sans token a retourné ${response.status} au lieu de 401.`
        ).to.eq(401);
      });
    });

    it('devrait supprimer un produit du panier ou retourner 404 si inexistant', () => {
      cy.request({
        method: 'POST',
        url: `${API}/login`,
        body: { username: VALID_EMAIL, password: VALID_PASSWORD },
      }).then((loginResponse) => {
        const token = loginResponse.body.token;
        cy.request({
          method: 'DELETE',
          url: `${API}/orders/999999/delete`,
          headers: { Authorization: `Bearer ${token}` },
          failOnStatusCode: false,
        }).then((response) => {
          expect(
            response.status,
            `BUG DÉTECTÉ : DELETE /orders/999999/delete a retourné ${response.status}. Attendu : 200 (supprimé) ou 404 (ligne introuvable).`
          ).to.be.oneOf([200, 404]);
        });
      });
    });

  });

  // ─────────────────────────────────────────────
  // 10. PANIER - PUT /orders/{id}/change-quantity
  // ─────────────────────────────────────────────

  describe('PUT /orders/{id}/change-quantity', () => {

    it('devrait retourner 401 sans token', () => {
      cy.request({
        method: 'PUT',
        url: `${API}/orders/1/change-quantity`,
        body: { quantity: 2 },
        failOnStatusCode: false,
      }).then((response) => {
        expect(
          response.status,
          `BUG DÉTECTÉ : PUT /orders/1/change-quantity sans token a retourné ${response.status} au lieu de 401.`
        ).to.eq(401);
      });
    });

    it('devrait retourner une erreur pour une quantité invalide (0 ou négative)', () => {
      cy.request({
        method: 'POST',
        url: `${API}/login`,
        body: { username: VALID_EMAIL, password: VALID_PASSWORD },
      }).then((loginResponse) => {
        const token = loginResponse.body.token;
        cy.request({
          method: 'PUT',
          url: `${API}/orders/1/change-quantity`,
          headers: { Authorization: `Bearer ${token}` },
          body: { quantity: 0 },
          failOnStatusCode: false,
        }).then((response) => {
          expect(
            response.status,
            `BUG DÉTECTÉ : PUT /orders/1/change-quantity avec quantity=0 a retourné ${response.status} au lieu d'une erreur 4xx.`
          ).to.be.gte(400);
        });
      });
    });

  });

  // ─────────────────────────────────────────────
  // 12. INSCRIPTION - POST /register
  // ─────────────────────────────────────────────

  describe('POST /register', () => {

    it('devrait retourner une erreur si le body est vide', () => {
      cy.request({
        method: 'POST',
        url: `${API}/register`,
        body: {},
        failOnStatusCode: false,
      }).then((response) => {
        expect(
          response.status,
          `BUG DÉTECTÉ : POST /register avec un body vide a retourné ${response.status} au lieu d'une erreur 4xx.`
        ).to.be.gte(400);
      });
    });

    it('devrait retourner une erreur pour un email déjà utilisé', () => {
      cy.request({
        method: 'POST',
        url: `${API}/register`,
        body: { email: VALID_EMAIL, password: VALID_PASSWORD, firstname: 'Test', lastname: 'User' },
        failOnStatusCode: false,
      }).then((response) => {
        expect(
          response.status,
          `BUG DÉTECTÉ : POST /register avec un email déjà existant a retourné ${response.status} au lieu de 409 ou 400.`
        ).to.be.gte(400);
      });
    });

    it('devrait créer un compte avec des données valides et uniques', () => {
      const uniqueEmail = `test_cypress_${Date.now()}@test.fr`;
      cy.request({
        method: 'POST',
        url: `${API}/register`,
        body: { email: uniqueEmail, password: 'TestPassword1!', firstname: 'Cypress', lastname: 'Test' },
        failOnStatusCode: false,
      }).then((response) => {
        expect(
          response.status,
          `BUG DÉTECTÉ : POST /register avec des données valides a retourné ${response.status} au lieu de 200 ou 201.`
        ).to.be.oneOf([200, 201]);
      });
    });

  });

  // ─────────────────────────────────────────────
  // 11. PROFIL - GET /me
  // ─────────────────────────────────────────────

  describe('GET /me', () => {

    it('devrait retourner 403 sans token (ANOMALIE : retourne 401)', () => {
      cy.request({
        method: 'GET',
        url: `${API}/me`,
        failOnStatusCode: false,
      }).then((response) => {
        // ANOMALIE DÉTECTÉE : l'API retourne 401 au lieu de 403 pour l'accès aux données
        // confidentielles d'un utilisateur sans authentification.
        // Attendu : 403 Forbidden. Reçu : 401 Unauthorized.
        expect(
          response.status,
          `ANOMALIE DÉTECTÉE : GET /me sans token a retourné ${response.status} au lieu de 403 Forbidden. L'API devrait retourner 403 pour indiquer que l'accès aux données confidentielles est interdit.`
        ).to.eq(403);
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
