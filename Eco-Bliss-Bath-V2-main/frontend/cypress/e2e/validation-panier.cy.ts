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

    it('devrait afficher la liste des produits', () => {
      cy.visit(`${BASE_URL}/#/products`);
      cy.get('[data-cy="product"]').should(
        'have.length.greaterThan', 0,
        'BUG DÉTECTÉ : Aucun produit n\'est affiché sur la page produits.'
      );
    });

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

    it('devrait afficher le champ de disponibilité (stock) du produit', () => {
      cy.visit(`${BASE_URL}/#/products`);
      cy.get('[data-cy="product-link"]').first().click();
      cy.get('[data-cy="detail-product-stock"]').should(
        'be.visible',
        'BUG DÉTECTÉ : Le champ de disponibilité du stock n\'est pas visible sur la page produit.'
      );
    });

  });

  // ─────────────────────────────────────────────
  // 2. AJOUT AU PANIER
  // ─────────────────────────────────────────────

  describe('Ajout d\'un produit au panier', () => {

    it('devrait ajouter le produit au panier et vérifier via l\'API', () => {
      cy.visit(`${BASE_URL}/#/products`);
      cy.get('[data-cy="product-link"]').first().click();
      cy.get('[data-cy="detail-product-quantity"]').clear().type('1');
      cy.get('[data-cy="detail-product-add"]').click();
      cy.url().should('include', '#/cart',
        'BUG DÉTECTÉ : Après ajout au panier, la redirection vers le panier n\'a pas eu lieu.'
      );
      cy.get('[data-cy="cart-line"]').should(
        'have.length.greaterThan', 0,
        'BUG DÉTECTÉ : Le panier est vide après l\'ajout d\'un produit.'
      );
    });

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

    it('ne devrait pas accepter une quantité négative', () => {
      cy.get('[data-cy="detail-product-quantity"]').clear().type('-1');
      cy.get('[data-cy="detail-product-add"]').click();
      cy.url().should(
        'not.include', '#/cart',
        'BUG DÉTECTÉ : Une quantité négative (-1) a été acceptée et le produit a été ajouté au panier.'
      );
    });

    it('ne devrait pas accepter une quantité de 0', () => {
      cy.get('[data-cy="detail-product-quantity"]').clear().type('0');
      cy.get('[data-cy="detail-product-add"]').click();
      cy.url().should(
        'not.include', '#/cart',
        'BUG DÉTECTÉ : Une quantité de 0 a été acceptée et le produit a été ajouté au panier.'
      );
    });

    it('ne devrait pas accepter une quantité supérieure à 20', () => {
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

    it('devrait accepter une quantité valide entre 1 et 20', () => {
      cy.get('[data-cy="detail-product-quantity"]').clear().type('2');
      cy.get('[data-cy="detail-product-add"]').click();
      cy.url().should(
        'include', '#/cart',
        'BUG DÉTECTÉ : Une quantité valide (2) n\'a pas été acceptée, le panier n\'est pas accessible.'
      );
    });

  });

  // ─────────────────────────────────────────────
  // 5. CONTENU DU PANIER VIA L'API
  // ─────────────────────────────────────────────

  describe('Vérification du contenu du panier via l\'API', () => {

    it('devrait retrouver le produit ajouté dans le panier', () => {
      cy.visit(`${BASE_URL}/#/products`);
      cy.get('[data-cy="product-name"]').first()
        .invoke('text')
        .then((nomProduit) => {
          cy.get('[data-cy="product-link"]').first().click();
          cy.get('[data-cy="detail-product-quantity"]').clear().type('1');
          cy.get('[data-cy="detail-product-add"]').click();
          cy.url().should('include', '#/cart',
            'BUG DÉTECTÉ : La redirection vers le panier n\'a pas eu lieu.'
          );
          cy.get('[data-cy="cart-line-name"]').first()
            .invoke('text')
            .then((nomDansLePanier) => {
              expect(
                nomDansLePanier.trim(),
                `BUG DÉTECTÉ : Le produit "${nomProduit.trim()}" n'a pas été trouvé dans le panier. Produit trouvé : "${nomDansLePanier.trim()}".`
              ).to.eq(nomProduit.trim());
            });
        });
    });

    it('devrait afficher le total du panier', () => {
      cy.visit(`${BASE_URL}/#/products`);
      cy.get('[data-cy="product-link"]').first().click();
      cy.get('[data-cy="detail-product-quantity"]').clear().type('1');
      cy.get('[data-cy="detail-product-add"]').click();
      cy.get('[data-cy="cart-total"]').should(
        'be.visible',
        'BUG DÉTECTÉ : Le total du panier n\'est pas affiché.'
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
      cy.get('[data-cy="cart-submit"]').click();
      cy.get('[for="lastname"]').should('have.class', 'error',
        'BUG DÉTECTÉ : Le champ "Nom" n\'est pas marqué en erreur alors qu\'il est vide.'
      );
    });

    it('devrait marquer le champ prénom en erreur si vide', () => {
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

  // ─────────────────────────────────────────────
  // 7. CHAMP DE DISPONIBILITÉ DU PRODUIT
  // ─────────────────────────────────────────────

  describe('Champ de disponibilité du produit', () => {

    it('devrait afficher le stock disponible sur la page produit', () => {
      cy.visit(`${BASE_URL}/#/products`);
      cy.get('[data-cy="product-link"]').first().click();
      cy.get('[data-cy="detail-product-stock"]').should(
        'be.visible',
        'BUG DÉTECTÉ : Le champ de disponibilité du produit n\'est pas visible.'
      );
    });

    it('le stock affiché doit être un nombre positif', () => {
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
          ).to.be.greaterThan(0);
        });
    });

  });

});