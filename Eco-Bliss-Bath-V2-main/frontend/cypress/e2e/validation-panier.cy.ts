describe('Validation panier - EcoBlissBath', () => {

  const BASE_URL = 'http://localhost:4200';

  const login = () => {
    cy.session('userSession', () => {
      cy.visit(`${BASE_URL}/#/login`);
      cy.get('[data-cy="login-input-username"]').type('test2@test.fr');
      cy.get('[data-cy="login-input-password"]').type('testtest');
      cy.get('[data-cy="login-submit"]').click();
      cy.url().should('eq', `${BASE_URL}/#/`,
        'BUG DÉTECTÉ : La connexion a échoué, la redirection vers la page d\'accueil n\'a pas eu lieu.');
    });
  };

  beforeEach(() => {
    login();
  });

  // ─────────────────────────────────────────────
  // 1. SÉLECTION D'UN PRODUIT
  // ─────────────────────────────────────────────

  describe('Sélection d\'un produit avec stock suffisant', () => {

    it('devrait accéder à un produit dont le stock est supérieur à 1', () => {
      cy.visit(`${BASE_URL}/#/products`);
      cy.get('[data-cy="product-link"]').first().click();
      cy.get('[data-cy="detail-product-stock"]')
        .should('not.be.empty')
        .invoke('text')
        .then((text) => {
          cy.log('Stock texte brut : ' + text);
          const stock = parseInt(text.trim().split(' ')[0]);
          expect(
            stock,
            `BUG DÉTECTÉ : Le stock affiché est "${text.trim()}" (valeur=${stock}). Le stock ne devrait pas être négatif ou nul.`
          ).to.be.greaterThan(1);
        });
    });

  });

  // ─────────────────────────────────────────────
  // 2. AJOUT AU PANIER
  // ─────────────────────────────────────────────

  describe('Ajout d\'un produit au panier', () => {

    it('devrait afficher le produit dans le panier', () => {
      cy.visit(`${BASE_URL}/#/products`);
      cy.get('[data-cy="product-link"]').first().click();
      cy.get('[data-cy="detail-product-quantity"]').clear().type('1');
      cy.get('[data-cy="detail-product-add"]').click();
      cy.url().should('include', '#/cart',
        'BUG DÉTECTÉ : La redirection vers le panier n\'a pas eu lieu après ajout.'
      );
      cy.get('[data-cy="cart-line"]').should(
        'have.length.greaterThan', 0,
        'BUG DÉTECTÉ : Aucune ligne produit n\'est visible dans le panier.'
      );
      cy.get('[data-cy="cart-line-name"]').should(
        'be.visible',
        'BUG DÉTECTÉ : Le nom du produit n\'est pas visible dans le panier.'
      );
    });

  });

  // ─────────────────────────────────────────────
  // 3. VÉRIFICATION DU STOCK APRÈS AJOUT
  // ─────────────────────────────────────────────

  describe('Vérification du stock après ajout au panier', () => {

    it('devrait afficher un stock réduit après ajout au panier', () => {
      cy.visit(`${BASE_URL}/#/products`);
      cy.get('[data-cy="product-link"]').first().click();
      cy.url().then((productUrl) => {
        cy.get('[data-cy="detail-product-stock"]')
          .should('not.be.empty')
          .invoke('text')
          .then((stockText) => {
            cy.log('Stock avant : ' + stockText);
            const stockAvant = parseInt(stockText.trim().split(' ')[0]);
            const quantiteAjoutee = 1;

            cy.get('[data-cy="detail-product-quantity"]').clear().type(String(quantiteAjoutee));
            cy.get('[data-cy="detail-product-add"]').click();

            cy.visit(productUrl);

            cy.get('[data-cy="detail-product-stock"]')
              .should('not.be.empty')
              .invoke('text')
              .then((newStockText) => {
                cy.log('Stock après : ' + newStockText);
                const stockApres = parseInt(newStockText.trim().split(' ')[0]);
                expect(
                  stockApres,
                  `BUG DÉTECTÉ : Stock avant=${stockAvant}, quantité ajoutée=${quantiteAjoutee}, stock après=${stockApres}. Le stock devrait être ${stockAvant - quantiteAjoutee}.`
                ).to.eq(stockAvant - quantiteAjoutee);
              });
          });
      });
    });

  });

  // ─────────────────────────────────────────────
  // 4. LIMITES DE QUANTITÉ
  // ─────────────────────────────────────────────

  describe('Vérification des limites de quantité', () => {

    beforeEach(() => {
      cy.visit(`${BASE_URL}/#/products`);
      cy.get('[data-cy="product-link"]').first().click();
    });

    it('saisir -1 dans le champ quantité ne doit pas ajouter le produit au panier (validation frontend)', () => {
      cy.get('[data-cy="detail-product-quantity"]').clear().type('-1');
      cy.get('[data-cy="detail-product-add"]').click();
      cy.url().should(
        'not.include', '#/cart',
        'BUG DÉTECTÉ : Une quantité négative (-1) a été acceptée et le produit a été ajouté au panier.'
      );
    });

    it('saisir 0 dans le champ quantité ne doit pas ajouter le produit au panier (validation frontend)', () => {
      cy.get('[data-cy="detail-product-quantity"]').clear().type('0');
      cy.get('[data-cy="detail-product-add"]').click();
      cy.url().should(
        'not.include', '#/cart',
        'BUG DÉTECTÉ : Une quantité de 0 a été acceptée et le produit a été ajouté au panier.'
      );
    });

    it('saisir 21 dans le champ quantité doit être refusé par l\'API avec une erreur (limite max = 20)', () => {
      cy.intercept('PUT', 'http://localhost:8081/orders/add').as('addToCart');
      cy.get('[data-cy="detail-product-quantity"]').clear().type('21');
      cy.get('[data-cy="detail-product-add"]').click();
      cy.wait('@addToCart').then((interception) => {
        const status = interception.response?.statusCode;
        if (status && status >= 400) {
          expect(status,
            `BUG DÉTECTÉ : L'API a refusé la quantité 21 avec le code ${status}.`
          ).to.be.gte(400);
        } else {
          cy.url().should(
            'include', '#/cart',
            'BUG DÉTECTÉ : Une quantité de 21 a été acceptée sans erreur par l\'API.'
          );
        }
      });
    });

    it('saisir 2 dans le champ quantité doit ajouter le produit au panier et rediriger vers #/cart', () => {
      cy.get('[data-cy="detail-product-quantity"]').clear().type('2');
      cy.get('[data-cy="detail-product-add"]').click();
      cy.url().should(
        'include', '#/cart',
        'BUG DÉTECTÉ : Une quantité valide (2) n\'a pas été acceptée, le panier n\'est pas accessible.'
      );
    });

  });

  // ─────────────────────────────────────────────
  // 5. VALIDATION DU STOCK
  // ─────────────────────────────────────────────

  describe('Validation du stock disponible', () => {

    it('ne devrait pas permettre de commander un produit avec un stock négatif (produit 3, stock=-8)', () => {
      cy.visit(`${BASE_URL}/#/products/3`);
      cy.intercept('PUT', 'http://localhost:8081/orders/add').as('addToCart');
      cy.get('[data-cy="detail-product-quantity"]').clear().type('1');
      cy.get('[data-cy="detail-product-add"]').click();
      cy.wait('@addToCart').its('response.statusCode').should(
        'be.gte', 400,
        'BUG DÉTECTÉ : Le site accepte une commande pour un produit avec un stock négatif (-8). L\'API devrait retourner une erreur.'
      );
    });

    it('ne devrait pas permettre de commander un produit en rupture de stock (produit 4, stock=0)', () => {
      cy.visit(`${BASE_URL}/#/products/4`);
      cy.intercept('PUT', 'http://localhost:8081/orders/add').as('addToCart');
      cy.get('[data-cy="detail-product-quantity"]').clear().type('1');
      cy.get('[data-cy="detail-product-add"]').click();
      cy.wait('@addToCart').its('response.statusCode').should(
        'be.gte', 400,
        'BUG DÉTECTÉ : Le site accepte une commande pour un produit en rupture de stock (stock=0). L\'API devrait retourner une erreur.'
      );
    });

    it('ne devrait pas permettre de commander une quantité supérieure au stock disponible (produit 7, stock=4, commande=10)', () => {
      cy.visit(`${BASE_URL}/#/products/7`);
      cy.intercept('PUT', 'http://localhost:8081/orders/add').as('addToCart');
      cy.get('[data-cy="detail-product-quantity"]').clear().type('10');
      cy.get('[data-cy="detail-product-add"]').click();
      cy.wait('@addToCart').its('response.statusCode').should(
        'be.gte', 400,
        'BUG DÉTECTÉ : Le site accepte une commande de 10 unités alors que le stock disponible est de 4. L\'API devrait retourner une erreur.'
      );
    });

  });

  // ─────────────────────────────────────────────
  // 6. VALIDATION DU PANIER
  // ─────────────────────────────────────────────

  describe('Validation du panier', () => {

    beforeEach(() => {
      cy.visit(`${BASE_URL}/#/products`);
      cy.get('[data-cy="product-link"]').first().click();
      cy.get('[data-cy="detail-product-quantity"]').clear().type('1');
      cy.get('[data-cy="detail-product-add"]').click();
      cy.url().should('include', '#/cart',
        'BUG DÉTECTÉ : Impossible d\'accéder au panier pour effectuer la validation.'
      );
    });

    it('ne devrait pas valider si les champs sont vides', () => {
      cy.get('[data-cy="cart-submit"]').click();
      cy.url().should('include', '#/cart',
        'BUG DÉTECTÉ : Le panier a été validé alors que tous les champs sont vides.'
      );
    });

    it('devrait marquer le champ nom en erreur si vide', () => {
      cy.get('[data-cy="cart-input-lastname"]').should('not.have.value', '');
      cy.get('[data-cy="cart-input-lastname"]').clear().trigger('input');
      cy.get('[data-cy="cart-submit"]').click();
      cy.get('[for="lastname"]').should('have.class', 'error',
        'BUG DÉTECTÉ : Le champ "Nom" n\'est pas marqué en erreur alors qu\'il est vide.'
      );
    });

    it('devrait marquer le champ prénom en erreur si vide', () => {
      cy.get('[data-cy="cart-input-firstname"]').should('not.have.value', '');
      cy.get('[data-cy="cart-input-firstname"]').clear().trigger('input');
      cy.get('[data-cy="cart-submit"]').click();
      cy.get('[for="firstname"]').should('have.class', 'error',
        'BUG DÉTECTÉ : Le champ "Prénom" n\'est pas marqué en erreur alors qu\'il est vide.'
      );
    });

    it('devrait marquer le champ adresse en erreur si vide', () => {
      cy.get('[data-cy="cart-submit"]').click();
      cy.get('[for="address"]').should('have.class', 'error',
        'BUG DÉTECTÉ : Le champ "Adresse" n\'est pas marqué en erreur alors qu\'il est vide.'
      );
    });

    it('devrait marquer le code postal en erreur s\'il fait moins de 5 chiffres', () => {
      cy.get('[data-cy="cart-input-lastname"]').type('Dupont');
      cy.get('[data-cy="cart-input-firstname"]').type('Jean');
      cy.get('[data-cy="cart-input-address"]').type('1 rue de la Paix');
      cy.get('[data-cy="cart-input-zipcode"]').type('123');
      cy.get('[data-cy="cart-input-city"]').type('Paris');
      cy.get('[data-cy="cart-submit"]').click();
      cy.get('[for="zipCode"]').should('have.class', 'error',
        'BUG DÉTECTÉ : Le code postal "123" (moins de 5 chiffres) a été accepté sans erreur.'
      );
    });

    it('devrait valider le panier et rediriger vers la confirmation', () => {
      cy.get('[data-cy="cart-input-lastname"]').type('Dupont');
      cy.get('[data-cy="cart-input-firstname"]').type('Jean');
      cy.get('[data-cy="cart-input-address"]').type('1 rue de la Paix');
      cy.get('[data-cy="cart-input-zipcode"]').type('75001');
      cy.get('[data-cy="cart-input-city"]').type('Paris');
      cy.get('[data-cy="cart-submit"]').click();
      cy.url().should('include', '#/confirmation',
        'BUG DÉTECTÉ : La validation du panier avec des champs corrects n\'a pas redirigé vers la page de confirmation.'
      );
    });

    it('devrait afficher le message "Merci" sur la page de confirmation', () => {
      cy.get('[data-cy="cart-input-lastname"]').type('Dupont');
      cy.get('[data-cy="cart-input-firstname"]').type('Jean');
      cy.get('[data-cy="cart-input-address"]').type('1 rue de la Paix');
      cy.get('[data-cy="cart-input-zipcode"]').type('75001');
      cy.get('[data-cy="cart-input-city"]').type('Paris');
      cy.get('[data-cy="cart-submit"]').click();
      cy.contains('Merci').should('be.visible',
        'BUG DÉTECTÉ : Le message "Merci" n\'est pas affiché sur la page de confirmation.'
      );
    });

  });

});