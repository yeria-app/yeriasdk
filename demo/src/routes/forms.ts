import { Router, Request, Response } from 'express';
import { YeriaApp } from '@numerum-tech/yeriasdk';
import { DEMO_KEYS } from '../security/demo-keys';

const router = Router();

const yeriaApp = new YeriaApp({
  appId: 'demo-app-forms',
  viewExpirationMinutes: 30,
  privateKey: DEMO_KEYS.privateKey,
  publicKey: DEMO_KEYS.publicKey
});

// Comprehensive form with all field types
router.get('/', (req: Request, res: Response) => {
  const form = yeriaApp
    .createFormView('comprehensive-form', 'Formulaire complet - Tous les types de champs')
    .setNote('Ce formulaire démontre tous les types de champs disponibles dans le SDK Yeria')

    // Text fields
    .addTextField('username', 'Nom d\'utilisateur', true, 50)
    .addTextField('firstName', 'Prénom', false, 100)

    // TextArea field
    .addTextAreaField('bio', 'Biographie', false, 10, 500)
    .addTextAreaField('description', 'Description détaillée', false, 20, 1000)

    // Email and Phone
    .addEmailField('email', 'Adresse email', true)
    .addPhoneField('phone', 'Numéro de téléphone', false)

    // Password fields
    .addPasswordField('password', 'Mot de passe', 8)
    .addPasswordField('confirmPassword', 'Confirmer le mot de passe', 8)

    // Number fields
    .addNumberField('age', 'Âge', false, 18, 120)
    .addNumberField('quantity', 'Quantité', true, 1, 100)

    // Date fields
    .addDateField('birthdate', 'Date de naissance', false)
    .addDateField('appointmentDate', 'Date de rendez-vous', true)

    // URL field
    .addURLField('website', 'Site web', false)
    .addURLField('portfolio', 'Portfolio', false)

    // Select fields
    .addSelectField('country', 'Pays', true, [
      { value: 'us', label: 'États-Unis' },
      { value: 'ca', label: 'Canada' },
      { value: 'uk', label: 'Royaume-Uni' },
      { value: 'fr', label: 'France' },
      { value: 'de', label: 'Allemagne' }
    ])
    .addSelectField('category', 'Catégorie', false, [
      { value: 'tech', label: 'Technologie' },
      { value: 'business', label: 'Business' },
      { value: 'education', label: 'Éducation' }
    ])
    .addSelectField('gender', 'Genre', true, [
      { value: 'male', label: 'Homme' },
      { value: 'female', label: 'Femme' },
      { value: 'other', label: 'Autre' },
      { value: 'prefer-not-to-say', label: 'Préfère ne pas dire' }
    ])

    // Checkbox fields
    .addCheckboxField('newsletter', 'S\'abonner à la newsletter', false)
    .addCheckboxField('terms', 'J\'accepte les conditions d\'utilisation', true)

    // Photo field (avec option live pour capture directe)
    .addPhotoField('avatar', 'Photo de profil', false, ['jpeg', 'png'], false)
    .addPhotoField('selfie', 'Selfie en direct', false, ['jpeg'], true)

    // File upload
    .addFileField('resume', 'CV (PDF)', false, ['application/pdf'])
    .addFileField('document', 'Document', false, ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'])

    // GPS Location
    .addGPSField('location', 'Position actuelle', false, false)
    .addPlusCodeField('deliveryLocation', 'Adresse de livraison (Plus Code)', false, false)

    // Hidden field (pour données techniques)
    .addHiddenField('referrer', 'Referrer', 'direct')
    .addHiddenField('formVersion', 'Form Version', 'v2.0');

  // A form has a single submit action; the convenience update/delete helpers
  // each overwrite `submit`, so calling several leaves only the last one.
  form.submitButton('Soumettre le formulaire', 'POST');

  res.json(yeriaApp.serve(form));
});

// Form submission handler - POST /api/forms
router.post('/', (req: Request, res: Response) => {
  const formData = req.body;

  console.log('Form submission received:', formData);

  // Simulate validation and processing
  const errors: string[] = [];

  // Basic validation
  if (!formData.username) errors.push('Le nom d\'utilisateur est requis');
  if (!formData.email) errors.push('L\'adresse email est requise');
  if (!formData.quantity) errors.push('La quantité est requise');
  if (!formData.appointmentDate) errors.push('La date de rendez-vous est requise');
  if (!formData.country) errors.push('Le pays est requis');
  if (!formData.gender) errors.push('Le genre est requis');
  if (!formData.terms) errors.push('Vous devez accepter les conditions d\'utilisation');

  if (errors.length > 0) {
    // Return error MessageView
    const errorMessage = yeriaApp
      .createMessageView('form-error', 'Erreur de validation du formulaire', 'error')
      .setBody(`Veuillez corriger les erreurs suivantes :\n\n${errors.map(e => `• ${e}`).join('\n')}`);

    return res.status(400).json(yeriaApp.serve(errorMessage));
  }

  // Success MessageView
  const recordId = `FORM-${Date.now()}`;
  const successMessage = yeriaApp
    .createMessageView('form-success', 'Formulaire soumis avec succès', 'success')
    .setBody(`Merci ${formData.username} !\n\nVotre formulaire a été soumis avec succès.\n\nDétails :\n• Email : ${formData.email}\n• Pays : ${formData.country}\n• ID d'enregistrement : ${recordId}\n\nDate : ${new Date().toISOString()}`);

  res.json(yeriaApp.serve(successMessage));
});

export default router;