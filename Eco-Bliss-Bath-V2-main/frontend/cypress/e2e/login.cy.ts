describe('Page de connexion - EcoBlissBath', () => {

  const BASE_URL = 'http://localhost:4200';
  const API_LOGIN = 'http://localhost:8081/login';

  beforeEach(() => {
    cy.clearLocalStorage();
    cy.visit(`${BASE_URL}/#/login`);
  });

  // ─────────────────────────────────────────────
  // 1. CONNEXION RÉUSSIE
  // ─────────────────────────────────────────────

  describe('Connexion réussie', () => {

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
        expect(
          win.localStorage.getItem('user'),
          'BUG DÉTECTÉ : Le token n\'a pas été stocké dans le localStorage après une connexion réussie.'
        ).to.equal('fake-jwt-token-123');
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
      cy.url().should(
        'eq', `${BASE_URL}/#/`,
        'BUG DÉTECTÉ : Après connexion réussie, la redirection vers la page d\'accueil n\'a pas eu lieu.'
      );
    });

  });

  // ─────────────────────────────────────────────
  // 2. CONNEXION ÉCHOUÉE - 401
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
        .should('be.visible', 'BUG DÉTECTÉ : Le message d\'erreur n\'est pas visible après un échec de connexion.')
        .and('contain', 'Identifiants incorrects', 'BUG DÉTECTÉ : Le message affiché ne correspond pas à "Identifiants incorrects".');
    });

    it('devrait marquer le champ email en erreur', () => {
      cy.get('[for="username"]').should(
        'have.class', 'error',
        'BUG DÉTECTÉ : Le champ email n\'est pas marqué en erreur après un échec de connexion 401.'
      );
    });

    it('devrait marquer le champ mot de passe en erreur', () => {
      cy.get('[for="password"]').should(
        'have.class', 'error',
        'BUG DÉTECTÉ : Le champ mot de passe n\'est pas marqué en erreur après un échec de connexion 401.'
      );
    });

    it('ne devrait pas stocker de token dans le localStorage', () => {
      cy.window().then((win) => {
        expect(
          win.localStorage.getItem('user'),
          'BUG DÉTECTÉ : Un token a été stocké dans le localStorage malgré un échec de connexion 401.'
        ).to.be.null;
      });
    });

    it('ne devrait pas rediriger vers l\'accueil', () => {
      cy.url().should(
        'include', '#/login',
        'BUG DÉTECTÉ : L\'utilisateur a été redirigé hors de la page de connexion malgré un échec 401.'
      );
    });

  });

  // ─────────────────────────────────────────────
  // 3. VALIDATION - CHAMPS VIDES
  // ─────────────────────────────────────────────

  describe('Validation - champs vides', () => {

    beforeEach(() => {
      cy.intercept('POST', API_LOGIN).as('loginRequest');
      cy.get('[data-cy="login-submit"]').click();
    });

    it('ne devrait pas appeler l\'API si les champs sont vides', () => {
      cy.get('@loginRequest.all').should(
        'have.length', 0,
        'BUG DÉTECTÉ : L\'API a été appelée alors que les champs email et mot de passe sont vides.'
      );
    });

    it('devrait afficher le message "Merci de remplir correctement tous les champs"', () => {
      cy.get('[data-cy="login-errors"]')
        .should('be.visible', 'BUG DÉTECTÉ : Le message de validation n\'est pas affiché.')
        .and('contain', 'Merci de remplir correctement tous les champs',
          'BUG DÉTECTÉ : Le message de validation affiché ne correspond pas au message attendu.'
        );
    });

    it('devrait marquer le label email en erreur', () => {
      cy.get('[for="username"]').should(
        'have.class', 'error',
        'BUG DÉTECTÉ : Le label email n\'est pas marqué en erreur alors que le champ est vide.'
      );
    });

    it('devrait marquer le label mot de passe en erreur', () => {
      cy.get('[for="password"]').should(
        'have.class', 'error',
        'BUG DÉTECTÉ : Le label mot de passe n\'est pas marqué en erreur alors que le champ est vide.'
      );
    });

  });

  // ─────────────────────────────────────────────
  // 4. VALIDATION - FORMAT EMAIL INVALIDE
  // ─────────────────────────────────────────────

  describe('Validation - format email invalide', () => {

    beforeEach(() => {
      cy.intercept('POST', API_LOGIN).as('loginRequest');
      cy.get('[data-cy="login-input-username"]').type('pasunemail');
      cy.get('[data-cy="login-input-password"]').type('testtest');
      cy.get('[data-cy="login-submit"]').click();
    });

    it('ne devrait pas appeler l\'API avec un email invalide', () => {
      cy.get('@loginRequest.all').should(
        'have.length', 0,
        'BUG DÉTECTÉ : L\'API a été appelée avec un email au format invalide ("pasunemail").'
      );
    });

    it('devrait afficher un message d\'erreur de validation', () => {
      cy.get('[data-cy="login-errors"]')
        .should('be.visible', 'BUG DÉTECTÉ : Le message d\'erreur n\'est pas affiché pour un email invalide.')
        .and('contain', 'Merci de remplir correctement tous les champs',
          'BUG DÉTECTÉ : Le message affiché ne correspond pas au message attendu pour un email invalide.'
        );
    });

    it('devrait marquer le label email en erreur', () => {
      cy.get('[for="username"]').should(
        'have.class', 'error',
        'BUG DÉTECTÉ : Le label email n\'est pas marqué en erreur pour un format d\'email invalide.'
      );
    });

  });

  // ─────────────────────────────────────────────
  // 5. ÉTAT DE CHARGEMENT (loading)
  // ─────────────────────────────────────────────

  describe('État de chargement', () => {

    it('devrait afficher le spinner et masquer le texte pendant la requête', () => {
      cy.intercept('POST', API_LOGIN, (req) => {
        req.on('response', (res) => { res.setDelay(500); });
        req.reply({ statusCode: 200, body: { token: 'fake-token' } });
      }).as('loginSlow');

      cy.get('[data-cy="login-input-username"]').type('test2@test.fr');
      cy.get('[data-cy="login-input-password"]').type('testtest');
      cy.get('[data-cy="login-submit"]').click();

      cy.get('[data-cy="login-submit"] .fa-spin').should(
        'be.visible',
        'BUG DÉTECTÉ : Le spinner de chargement n\'est pas affiché pendant la requête.'
      );
      cy.get('[data-cy="login-submit"]').should(
        'not.contain', 'Se connecter',
        'BUG DÉTECTÉ : Le texte "Se connecter" est toujours visible pendant le chargement.'
      );
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
        expect(
          callCount,
          `BUG DÉTECTÉ : L'API a été appelée ${callCount} fois alors qu'elle ne devrait être appelée qu'une seule fois pendant le chargement.`
        ).to.equal(1);
      });
    });

  });

  // ─────────────────────────────────────────────
  // 6. NAVIGATION VERS L'INSCRIPTION
  // ─────────────────────────────────────────────

  describe('Navigation vers l\'inscription', () => {

    it('devrait afficher le lien vers la page d\'inscription', () => {
      cy.contains('S\'inscrire').should(
        'be.visible',
        'BUG DÉTECTÉ : Le lien "S\'inscrire" n\'est pas visible sur la page de connexion.'
      );
    });

    it('devrait naviguer vers /#/register en cliquant sur S\'inscrire', () => {
      cy.contains('S\'inscrire').click();
      cy.url().should(
        'include', '#/register',
        'BUG DÉTECTÉ : Le clic sur "S\'inscrire" n\'a pas redirigé vers la page d\'inscription.'
      );
    });

  });

});