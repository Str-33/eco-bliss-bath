import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { ReactiveFormsModule } from '@angular/forms';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { RouterTestingModule } from '@angular/router/testing';

import { LoginComponent } from './login.component';

describe('LoginComponent', () => {
  let component: LoginComponent;
  let fixture: ComponentFixture<LoginComponent>;
  let httpMock: HttpTestingController;

  const API_LOGIN = 'http://localhost:8081/login';

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [LoginComponent],
      imports: [
        ReactiveFormsModule,
        HttpClientTestingModule,
        RouterTestingModule,
      ],
    }).compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(LoginComponent);
    component = fixture.componentInstance;
    httpMock = TestBed.inject(HttpTestingController);
    fixture.detectChanges();
  });

  afterEach(() => {
    httpMock.verify(); // Vérifie qu'aucune requête HTTP inattendue n'est en attente
    localStorage.clear();
  });

  // ─────────────────────────────────────────────
  // 1. CRÉATION DU COMPOSANT
  // ─────────────────────────────────────────────

  describe('Création', () => {

    it('devrait créer le composant', () => {
      expect(component).toBeTruthy();
    });

    it('devrait initialiser le formulaire avec des champs vides', () => {
      expect(component.loginForm.get('username')?.value).toBe('');
      expect(component.loginForm.get('password')?.value).toBe('');
    });

    it('devrait initialiser error à une chaîne vide', () => {
      expect(component.error).toBe('');
    });

    it('devrait initialiser loading à false', () => {
      expect(component.loading).toBeFalse();
    });

  });

  // ─────────────────────────────────────────────
  // 2. VALIDATION DU FORMULAIRE
  // ─────────────────────────────────────────────

  describe('Validation du formulaire', () => {

    it('le formulaire devrait être invalide si les champs sont vides', () => {
      expect(component.loginForm.valid).toBeFalse();
    });

    it('le formulaire devrait être invalide si l\'email est mal formaté', () => {
      component.loginForm.setValue({ username: 'pasunemail', password: 'testtest' });
      expect(component.loginForm.valid).toBeFalse();
    });

    it('le formulaire devrait être invalide si le mot de passe est vide', () => {
      component.loginForm.setValue({ username: 'test2@test.fr', password: '' });
      expect(component.loginForm.valid).toBeFalse();
    });

    it('le formulaire devrait être valide avec un email et mot de passe corrects', () => {
      component.loginForm.setValue({ username: 'test2@test.fr', password: 'testtest' });
      expect(component.loginForm.valid).toBeTrue();
    });

  });

  // ─────────────────────────────────────────────
  // 3. COMPORTEMENT AVEC FORMULAIRE INVALIDE
  // ─────────────────────────────────────────────

  describe('Soumission avec formulaire invalide', () => {

    it('devrait afficher le message d\'erreur de validation', () => {
      component.login();
      expect(component.error).toBe('Merci de remplir correctement tous les champs');
    });

    it('ne devrait pas appeler l\'API si le formulaire est invalide', () => {
      component.login();
      httpMock.expectNone(API_LOGIN);
    });

    it('ne devrait pas passer loading à true', () => {
      component.login();
      expect(component.loading).toBeFalse();
    });

    it('devrait marquer tous les champs comme touchés', () => {
      component.login();
      expect(component.loginForm.get('username')?.touched).toBeTrue();
      expect(component.loginForm.get('password')?.touched).toBeTrue();
    });

  });

  // ─────────────────────────────────────────────
  // 4. CONNEXION RÉUSSIE
  // ─────────────────────────────────────────────

  describe('Connexion réussie', () => {

    beforeEach(() => {
      component.loginForm.setValue({
        username: 'test2@test.fr',
        password: 'testtest',
      });
    });

    it('devrait appeler POST /login avec les bonnes valeurs', () => {
      component.login();

      const req = httpMock.expectOne(API_LOGIN);
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual({
        username: 'test2@test.fr',
        password: 'testtest',
      });
      req.flush({ token: 'fake-jwt-token' });
    });

    it('devrait passer loading à true pendant la requête', () => {
      component.login();
      expect(component.loading).toBeTrue();

      const req = httpMock.expectOne(API_LOGIN);
      req.flush({ token: 'fake-jwt-token' });
    });

    it('devrait passer loading à false après la réponse', fakeAsync(() => {
      component.login();
      const req = httpMock.expectOne(API_LOGIN);
      req.flush({ token: 'fake-jwt-token' });
      tick();
      expect(component.loading).toBeFalse();
    }));

    it('devrait stocker le token dans localStorage', fakeAsync(() => {
      component.login();
      const req = httpMock.expectOne(API_LOGIN);
      req.flush({ token: 'fake-jwt-token' });
      tick();
      expect(localStorage.getItem('user')).toBe('fake-jwt-token');
    }));

    it('ne devrait pas appeler l\'API une 2e fois si loading est déjà true', () => {
      component.loading = true;
      component.login();
      httpMock.expectNone(API_LOGIN);
    });

  });

  // ─────────────────────────────────────────────
  // 5. CONNEXION ÉCHOUÉE - 401
  // ─────────────────────────────────────────────

  describe('Connexion échouée - 401 Unauthorized', () => {

    beforeEach(() => {
      component.loginForm.setValue({
        username: 'mauvais@email.fr',
        password: 'mauvaisMotDePasse',
      });
    });

    it('devrait afficher le message "Identifiants incorrects"', fakeAsync(() => {
      component.login();
      const req = httpMock.expectOne(API_LOGIN);
      req.flush({ message: 'Unauthorized' }, { status: 401, statusText: 'Unauthorized' });
      tick();
      expect(component.error).toBe('Identifiants incorrects');
    }));

    it('devrait passer loading à false après l\'erreur', fakeAsync(() => {
      component.login();
      const req = httpMock.expectOne(API_LOGIN);
      req.flush({}, { status: 401, statusText: 'Unauthorized' });
      tick();
      expect(component.loading).toBeFalse();
    }));

    it('devrait mettre le champ username en état invalide', fakeAsync(() => {
      component.login();
      const req = httpMock.expectOne(API_LOGIN);
      req.flush({}, { status: 401, statusText: 'Unauthorized' });
      tick();
      expect(component.loginForm.get('username')?.errors).toEqual({ invalid: true });
    }));

    it('devrait mettre le champ password en état invalide', fakeAsync(() => {
      component.login();
      const req = httpMock.expectOne(API_LOGIN);
      req.flush({}, { status: 401, statusText: 'Unauthorized' });
      tick();
      expect(component.loginForm.get('password')?.errors).toEqual({ invalid: true });
    }));

    it('ne devrait pas stocker de token dans localStorage', fakeAsync(() => {
      component.login();
      const req = httpMock.expectOne(API_LOGIN);
      req.flush({}, { status: 401, statusText: 'Unauthorized' });
      tick();
      expect(localStorage.getItem('user')).toBeNull();
    }));

  });

  // ─────────────────────────────────────────────
  // 6. RÉINITIALISATION DES ERREURS
  // ─────────────────────────────────────────────

  describe('Réinitialisation des erreurs avant soumission', () => {

    it('devrait réinitialiser error à "" avant chaque tentative valide', () => {
      component.loginForm.setValue({
        username: 'test2@test.fr',
        password: 'testtest',
      });
      component.error = 'Une ancienne erreur';
      component.login();

      expect(component.error).toBe('');

      httpMock.expectOne(API_LOGIN).flush({ token: 'fake-token' });
    });

    it('devrait effacer les erreurs de validation des champs avant la requête', () => {
      component.loginForm.setValue({
        username: 'test2@test.fr',
        password: 'testtest',
      });
      // Simule des erreurs pré-existantes (ex: suite à un 401 précédent)
      component.loginForm.get('username')?.setErrors({ invalid: true });
      component.loginForm.get('password')?.setErrors({ invalid: true });

      component.login();

      // Les erreurs doivent être nettoyées avant l'appel
      const req = httpMock.expectOne(API_LOGIN);
      expect(component.loginForm.get('username')?.errors).toBeNull();
      expect(component.loginForm.get('password')?.errors).toBeNull();
      req.flush({ token: 'fake-token' });
    });

  });

});