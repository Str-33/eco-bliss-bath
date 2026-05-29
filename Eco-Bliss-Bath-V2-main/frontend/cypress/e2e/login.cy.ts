describe('Page de connexion - EcoBlissBath', () => {

  const API_LOGIN = 'http://localhost:8081/login';

  beforeEach(() => {
  cy.clearLocalStorage();
  cy.visit('http://localhost:4200/login');
});

  // ─────────────────────────────────────────────
  // 1. AFFICHAGE DU FORMULAIRE
  // ─────────────────────────────────────────────

  describe('Affichage du formulaire', () => {

    it('devrait afficher le formulaire de connexion', () => {
      cy.get('[data-cy="login-form"]').should('be.visible');
    });

    it('devrait afficher le champ email', () => {
      cy.get('[data-cy="login-input-username"]').should('be.visible');
    });

    it('devrait afficher le champ mot de passe', () => {
      cy.get('[data-cy="login-input-password"]').should('be.visible');
    });

    it('devrait afficher le bouton Se connecter', () => {
      cy.get('[data-cy="login-submit"]').should('be.visible').and('contain', 'Se connecter');
    });

    it('ne devrait pas afficher de message d\'erreur au chargement', () => {
      cy.get('[data-cy="login-errors"]').should('not.exist');
    });

  });

  // ─────────────────────────────────────────────
  // 2. CONNEXION RÉUSSIE
  // ─────────────────────────────────────────────

  describe('Connexion réussie', () => {

    it('devrait appeler l\'API avec les bons identifiants', () => {
      cy.intercept('POST', API_LOGIN, {
        statusCode: 200,
        body: { token: 'fake-jwt-token-123' },
      }).as('loginRequest');

      cy.get('[data-cy="login-input-username"]').type('test2@test.fr');
      cy.get('[data-cy="login-input-password"]').type('testtest');
      cy.get('[data-cy="login-submit"]').click();

      cy.wait('@loginRequest').its('request.body').should('deep.equal', {
        username: 'test2@test.fr',
        password: 'testtest',
      });
    });

    it('devrait stocker le token dans le localStorage après connexion', () => {
      cy.intercept('POST', API_LOGIN, {
        statusCode: 200,
        body: { token: 'fake-jwt-token-123' },
      }).as('loginRequest');

      cy.get('[data-cy="login-input-username"]').type('test2@test.fr');
      cy.get('[data-cy="login-input-password"]').type('testtest');
      cy.get('[data-cy="login-submit"]').click();

      cy.wait('@loginRequest');
      cy.window().then((win) => {
        expect(win.localStorage.getItem('user')).to.equal('fake-jwt-token-123');
      });
    });

    it('devrait rediriger vers la page d\'accueil après connexion', () => {
      cy.intercept('POST', API_LOGIN, {
        statusCode: 200,
        body: { token: 'fake-jwt-token-123' },
      }).as('loginRequest');

      cy.get('[data-cy="login-input-username"]').type('test2@test.fr');
      cy.get('[data-cy="login-input-password"]').type('testtest');
      cy.get('[data-cy="login-submit"]').click();

      cy.wait('@loginRequest');
      cy.url().should('eq', 'http://localhost:4200/');
    });

  });

  // ─────────────────────────────────────────────
  // 3. CONNEXION ÉCHOUÉE - 401
  // ─────────────────────────────────────────────

  describe('Connexion échouée - identifiants incorrects (401)', () => {

    beforeEach(() => {
      cy.intercept('POST', API_LOGIN, {
        statusCode: 401,
        body: { message: 'Unauthorized' },
      }).as('loginFail');

      cy.get('[data-cy="login-input-username"]').type('mauvais@email.fr');
      cy.get('[data-cy="login-input-password"]').type('mauvaisMotDePasse');
      cy.get('[data-cy="login-submit"]').click();
      cy.wait('@loginFail');
    });

    it('devrait afficher le message "Identifiants incorrects"', () => {
      cy.get('[data-cy="login-errors"]')
        .should('be.visible')
        .and('contain', 'Identifiants incorrects');
    });

    it('devrait marquer le champ email en erreur', () => {
      cy.get('[for="username"]').should('have.class', 'error');
    });

    it('devrait marquer le champ mot de passe en erreur', () => {
      cy.get('[for="password"]').should('have.class', 'error');
    });

    it('ne devrait pas stocker de token', () => {
      cy.window().then((win) => {
        expect(win.localStorage.getItem('user')).to.be.null;
      });
    });

    it('ne devrait pas rediriger', () => {
      cy.url().should('include', '/login');
    });

  });

  // ─────────────────────────────────────────────
  // 4. VALIDATION - CHAMPS VIDES
  // ─────────────────────────────────────────────

  describe('Validation - champs vides', () => {

    beforeEach(() => {
      cy.intercept('POST', API_LOGIN).as('loginRequest');
      cy.get('[data-cy="login-submit"]').click();
    });

    it('ne devrait pas appeler l\'API si les champs sont vides', () => {
      cy.get('@loginRequest.all').should('have.length', 0);
    });

    it('devrait afficher le message "Merci de remplir correctement tous les champs"', () => {
      cy.get('[data-cy="login-errors"]')
        .should('be.visible')
        .and('contain', 'Merci de remplir correctement tous les champs');
    });

    it('devrait marquer le champ email en erreur', () => {
      cy.get('[for="username"]').should('have.class', 'error');
    });

    it('devrait marquer le champ mot de passe en erreur', () => {
      cy.get('[for="password"]').should('have.class', 'error');
    });

  });

  // ─────────────────────────────────────────────
  // 5. VALIDATION - EMAIL INVALIDE
  // ─────────────────────────────────────────────

  describe('Validation - format email invalide', () => {

    beforeEach(() => {
      cy.intercept('POST', API_LOGIN).as('loginRequest');
      cy.get('[data-cy="login-input-username"]').type('pasunemail');
      cy.get('[data-cy="login-input-password"]').type('testtest');
      cy.get('[data-cy="login-submit"]').click();
    });

    it('ne devrait pas appeler l\'API avec un email invalide', () => {
      cy.get('@loginRequest.all').should('have.length', 0);
    });

    it('devrait afficher un message d\'erreur de validation', () => {
      cy.get('[data-cy="login-errors"]')
        .should('be.visible')
        .and('contain', 'Merci de remplir correctement tous les champs');
    });

    it('devrait marquer le champ email en erreur', () => {
      cy.get('[for="username"]').should('have.class', 'error');
    });

  });

  // ─────────────────────────────────────────────
  // 6. ÉTAT DE CHARGEMENT (loading)
  // ─────────────────────────────────────────────

  describe('État de chargement', () => {

    it('devrait afficher le spinner pendant la requête', () => {
      cy.intercept('POST', API_LOGIN, (req) => {
        req.on('response', (res) => {
          res.setDelay(500);
        });
        req.reply({ statusCode: 200, body: { token: 'fake-token' } });
      }).as('loginSlow');

      cy.get('[data-cy="login-input-username"]').type('test2@test.fr');
      cy.get('[data-cy="login-input-password"]').type('testtest');
      cy.get('[data-cy="login-submit"]').click();

      cy.get('[data-cy="login-submit"] .fa-spin').should('be.visible');
      cy.get('[data-cy="login-submit"]').should('not.contain', 'Se connecter');
    });

    it('ne devrait pas relancer une requête si loading est déjà actif', () => {
      let callCount = 0;
      cy.intercept('POST', API_LOGIN, (req) => {
        callCount++;
        req.on('response', (res) => res.setDelay(500));
        req.reply({ statusCode: 200, body: { token: 'fake-token' } });
      }).as('loginSlow');

      cy.get('[data-cy="login-input-username"]').type('test2@test.fr');
      cy.get('[data-cy="login-input-password"]').type('testtest');
      cy.get('[data-cy="login-submit"]').click();
      cy.get('[data-cy="login-submit"]').click();
      cy.get('[data-cy="login-submit"]').click();

      cy.wait('@loginSlow').then(() => {
        expect(callCount).to.equal(1);
      });
    });

  });

  // ─────────────────────────────────────────────
  // 7. NAVIGATION VERS L'INSCRIPTION
  // ─────────────────────────────────────────────

  describe('Navigation', () => {

    it('devrait afficher le lien vers la page d\'inscription', () => {
      cy.contains('S\'inscrire').should('be.visible');
    });

    it('devrait naviguer vers /register en cliquant sur S\'inscrire', () => {
      cy.contains('S\'inscrire').click();
      cy.url().should('include', '/register');
    });

  });

});