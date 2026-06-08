describe('Smoke tests - EcoBlissBath', () => {

  const BASE_URL = 'http://localhost:4200';
  const API_LOGIN = 'http://localhost:8081/login';
  const API_REVIEWS = 'http://localhost:8081/reviews';

  const login = () => {
    cy.session('smokeSession', () => {
      cy.visit(`${BASE_URL}/#/login`);
      cy.get('[data-cy="login-input-username"]').type('test2@test.fr');
      cy.get('[data-cy="login-input-password"]').type('testtest');
      cy.get('[data-cy="login-submit"]').click();
      cy.url().should('eq', `${BASE_URL}/#/`);
    });
  };

  // ─────────────────────────────────────────────
  // 1. PAGE D'ACCUEIL
  // ─────────────────────────────────────────────

  describe('Page d\'accueil', () => {

    it('devrait charger la page d\'accueil sans erreur', () => {
      cy.visit(`${BASE_URL}/#/`);
      cy.get('body').should('be.visible',
        'BUG DÉTECTÉ : La page d\'accueil ne charge pas correctement.'
      );
    });

    it('devrait afficher la barre de navigation', () => {
      cy.visit(`${BASE_URL}/#/`);
      cy.get('app-navbar').should('exist',
        'BUG DÉTECTÉ : La barre de navigation n\'est pas présente sur la page d\'accueil.'
      );
    });

    it('devrait afficher le pied de page', () => {
      cy.visit(`${BASE_URL}/#/`);
      cy.get('app-footer').should('exist',
        'BUG DÉTECTÉ : Le pied de page n\'est pas présent sur la page d\'accueil.'
      );
    });

  });

  // ─────────────────────────────────────────────
  // 2. PAGE DE CONNEXION
  // ─────────────────────────────────────────────

  describe('Page de connexion', () => {

    it('devrait charger la page de connexion', () => {
      cy.visit(`${BASE_URL}/#/login`);
      cy.get('[data-cy="login-form"]').should('be.visible',
        'BUG DÉTECTÉ : La page de connexion ne charge pas le formulaire.'
      );
    });

    it('devrait permettre une connexion réussie', () => {
      cy.intercept('POST', API_LOGIN, {
        statusCode: 200,
        body: { token: 'smoke-test-token' },
      }).as('loginOk');
      cy.visit(`${BASE_URL}/#/login`);
      cy.get('[data-cy="login-input-username"]').type('test2@test.fr');
      cy.get('[data-cy="login-input-password"]').type('testtest');
      cy.get('[data-cy="login-submit"]').click();
      cy.wait('@loginOk');
      cy.url().should('eq', `${BASE_URL}/#/`,
        'BUG DÉTECTÉ : La connexion n\'a pas redirigé vers la page d\'accueil.'
      );
    });

  });

  // ─────────────────────────────────────────────
  // 3. PAGE DES PRODUITS
  // ─────────────────────────────────────────────

  describe('Page des produits', () => {

    it('devrait charger la liste des produits', () => {
      cy.visit(`${BASE_URL}/#/products`);
      cy.get('[data-cy="product"]').should('have.length.greaterThan', 0,
        'BUG DÉTECTÉ : La page produits ne charge aucun produit.'
      );
    });

    it('devrait ouvrir la page détail d\'un produit', () => {
      cy.visit(`${BASE_URL}/#/products`);
      cy.get('[data-cy="product-link"]').first().click();
      cy.url().should('include', '#/products/',
        'BUG DÉTECTÉ : Le clic sur un produit n\'a pas ouvert la page détail.'
      );
      cy.get('[data-cy="detail-product-stock"]').should('be.visible',
        'BUG DÉTECTÉ : La page détail produit ne charge pas le stock.'
      );
    });

  });

  // ─────────────────────────────────────────────
  // 4. PAGE D'INSCRIPTION
  // ─────────────────────────────────────────────

  describe('Page d\'inscription', () => {

    it('devrait charger le formulaire d\'inscription', () => {
      cy.visit(`${BASE_URL}/#/register`);
      cy.get('form').should('exist',
        'BUG DÉTECTÉ : La page d\'inscription ne charge pas de formulaire.'
      );
    });

  });

  // ─────────────────────────────────────────────
  // 5. PAGE DES AVIS
  // ─────────────────────────────────────────────

  describe('Page des avis', () => {

    it('devrait afficher la page des avis', () => {
      cy.visit(`${BASE_URL}/#/reviews`);
      cy.get('[data-cy="reviews-number"]').should('be.visible',
        'BUG DÉTECTÉ : Le compteur d\'avis n\'est pas visible sur la page des avis.'
      );
    });

    it('devrait afficher le formulaire d\'avis quand connecté', () => {
      login();
      cy.visit(`${BASE_URL}/#/reviews`);
      cy.get('[data-cy="review-form"]').should('be.visible',
        'BUG DÉTECTÉ : Le formulaire d\'ajout d\'avis n\'est pas visible pour un utilisateur connecté.'
      );
    });

    it('ne devrait pas afficher le formulaire d\'avis quand déconnecté', () => {
      cy.clearLocalStorage();
      cy.visit(`${BASE_URL}/#/reviews`);
      cy.get('[data-cy="review-form"]').should('not.exist',
        'BUG DÉTECTÉ : Le formulaire d\'ajout d\'avis est visible sans être connecté.'
      );
      cy.contains('Connectez-vous pour ajouter un avis').should('be.visible',
        'BUG DÉTECTÉ : Le message "Connectez-vous pour ajouter un avis" n\'est pas affiché pour un utilisateur non connecté.'
      );
    });

  });

  // ─────────────────────────────────────────────
  // 6. SÉCURITÉ XSS - AJOUT D'UN AVIS
  // ─────────────────────────────────────────────

  describe('Sécurité XSS - ajout d\'un avis', () => {

    const xssPayloads = [
      '<script>window.__xss_script = true;</script>',
      '<img src=x onerror="window.__xss_img = true;">',
      '<svg onload="window.__xss_svg = true;">',
    ];

    it('ne devrait pas exécuter un payload XSS dans le titre d\'un avis', () => {
      const mockReviews = [{
        id: 99,
        title: '<script>window.__xss_title = true;</script>Titre malveillant',
        comment: 'Commentaire normal',
        rating: 3,
        author: { firstname: 'Attaquant', lastname: 'Test' },
      }];

      cy.intercept('GET', API_REVIEWS, { statusCode: 200, body: mockReviews }).as('getReviews');
      cy.visit(`${BASE_URL}/#/reviews`);
      cy.wait('@getReviews');

      cy.window().then((win) => {
        expect(
          (win as any).__xss_title,
          'BUG DE SÉCURITÉ DÉTECTÉ : Un payload XSS dans le titre d\'un avis a été exécuté.'
        ).to.be.undefined;
      });
    });

    it('ne devrait pas exécuter un payload XSS via <script> dans le commentaire', () => {
      const mockReviews = [{
        id: 100,
        title: 'Titre normal',
        comment: '<script>window.__xss_script = true;</script>',
        rating: 4,
        author: { firstname: 'Attaquant', lastname: 'Test' },
      }];

      cy.intercept('GET', API_REVIEWS, { statusCode: 200, body: mockReviews }).as('getReviews');
      cy.visit(`${BASE_URL}/#/reviews`);
      cy.wait('@getReviews');

      cy.window().then((win) => {
        expect(
          (win as any).__xss_script,
          'BUG DE SÉCURITÉ DÉTECTÉ : Une balise <script> injectée dans un commentaire a été exécutée.'
        ).to.be.undefined;
      });
    });

    it('ne devrait pas exécuter un payload XSS via <img onerror> dans le commentaire', () => {
      const mockReviews = [{
        id: 101,
        title: 'Titre normal',
        comment: '<img src=x onerror="window.__xss_img = true;">',
        rating: 2,
        author: { firstname: 'Attaquant', lastname: 'Test' },
      }];

      cy.intercept('GET', API_REVIEWS, { statusCode: 200, body: mockReviews }).as('getReviews');
      cy.visit(`${BASE_URL}/#/reviews`);
      cy.wait('@getReviews');

      cy.window().then((win) => {
        expect(
          (win as any).__xss_img,
          'BUG DE SÉCURITÉ DÉTECTÉ : Un payload XSS via <img onerror> dans un commentaire a été exécuté. Le champ [innerHTML] n\'est pas correctement sanitisé.'
        ).to.be.undefined;
      });
    });

    it('ne devrait pas exécuter un payload XSS via <svg onload> dans le commentaire', () => {
      const mockReviews = [{
        id: 102,
        title: 'Titre normal',
        comment: '<svg onload="window.__xss_svg = true;">',
        rating: 1,
        author: { firstname: 'Attaquant', lastname: 'Test' },
      }];

      cy.intercept('GET', API_REVIEWS, { statusCode: 200, body: mockReviews }).as('getReviews');
      cy.visit(`${BASE_URL}/#/reviews`);
      cy.wait('@getReviews');

      cy.window().then((win) => {
        expect(
          (win as any).__xss_svg,
          'BUG DE SÉCURITÉ DÉTECTÉ : Un payload XSS via <svg onload> dans un commentaire a été exécuté. Le champ [innerHTML] n\'est pas correctement sanitisé.'
        ).to.be.undefined;
      });
    });

    it('ne devrait pas déclencher window.alert via un payload XSS dans le commentaire', () => {
      let alertFired = false;
      const mockReviews = [{
        id: 103,
        title: 'Titre normal',
        comment: '<img src=x onerror="alert(\'XSS\')">',
        rating: 5,
        author: { firstname: 'Attaquant', lastname: 'Test' },
      }];

      cy.on('window:alert', () => { alertFired = true; });
      cy.intercept('GET', API_REVIEWS, { statusCode: 200, body: mockReviews }).as('getReviews');
      cy.visit(`${BASE_URL}/#/reviews`);
      cy.wait('@getReviews');

      cy.then(() => {
        expect(
          alertFired,
          'BUG DE SÉCURITÉ DÉTECTÉ : Une fenêtre alert() a été déclenchée par un payload XSS dans le commentaire d\'un avis. La sanitisation [innerHTML] est insuffisante.'
        ).to.be.false;
      });
    });

    xssPayloads.forEach((payload, index) => {
      it(`ne devrait pas exécuter le payload XSS #${index + 1} soumis via l\'API de revue`, () => {
        const mockReviews = [{
          id: 200 + index,
          title: 'Titre',
          comment: payload,
          rating: 3,
          author: { firstname: 'Hacker', lastname: 'Test' },
        }];

        cy.intercept('GET', API_REVIEWS, { statusCode: 200, body: mockReviews }).as('reviews');
        cy.on('window:alert', () => {
          throw new Error(`BUG DE SÉCURITÉ DÉTECTÉ : alert() déclenché par le payload XSS: ${payload}`);
        });
        cy.visit(`${BASE_URL}/#/reviews`);
        cy.wait('@reviews');
        cy.get('[data-cy="review-comment"]').should('exist');
      });
    });

  });

});
