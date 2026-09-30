import { Router, Request, Response, NextFunction } from 'express';
import multer from 'multer';
import { createHash, randomUUID } from 'crypto';
import { closeSync, mkdirSync, openSync, readSync, statSync } from 'fs';
import path from 'path';
import { BRANDING_FONTS, BRANDING_SHAPES, YeriaApp, YeriaUI } from '@numerum-tech/yeriasdk';
import type { ServiceBranding } from '@numerum-tech/yeriasdk';
import { DEMO_BRANDING, DEMO_KEYS } from '../security/demo-keys';

const router = Router();

// A form carrying a photo, file, audio or video field is submitted as
// multipart/form-data, with each capture as a file part named after its
// fieldId (fieldId_0, fieldId_1, … when `multiple` is set). express.json()
// cannot read that, so without this the whole body arrives empty — including
// the plain text fields.
//
// Normal demo forms keep uploads in memory and never write them to disk; a real
// provider would stream them to storage. The opt-in upload-proof route below is
// the sole exception. `limits` is what a provider must size against the
// constraints it declared: 30s at `quality: 'low'` is roughly 4 MB, so 32 MB
// leaves room for the medium/high presets too.
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 32 * 1024 * 1024, files: 12 }
});

// This endpoint is deliberately opt-in: unlike the other demo receivers it
// persists uploads so a developer can inspect the exact bytes received.
const devDemosEnabled = process.env.ENABLE_DEV_DEMOS === 'true';
const uploadProofDir = path.resolve(
  process.env.UPLOAD_PROOF_DIR?.trim() || path.join(__dirname, '../../tmp/upload-proof')
);

if (devDemosEnabled) {
  mkdirSync(uploadProofDir, { recursive: true });
  console.log(`[yeria-demo] Upload proof enabled; received files are kept in ${uploadProofDir}`);
}

const uploadProof = multer({
  storage: multer.diskStorage({
    destination: uploadProofDir,
    filename: (_req, file, callback) => {
      const safeOriginalName = path.basename(file.originalname)
        .normalize('NFKD')
        .replace(/[^a-zA-Z0-9._-]+/g, '_')
        .slice(-120) || 'upload.bin';
      callback(null, `${Date.now()}-${randomUUID()}-${safeOriginalName}`);
    }
  }),
  limits: { fileSize: 32 * 1024 * 1024, files: 12 }
});

function sha256File(filePath: string): string {
  const hash = createHash('sha256');
  const descriptor = openSync(filePath, 'r');
  const chunk = Buffer.allocUnsafe(64 * 1024);

  try {
    let bytesRead: number;
    while ((bytesRead = readSync(descriptor, chunk, 0, chunk.length, null)) > 0) {
      hash.update(chunk.subarray(0, bytesRead));
    }
  } finally {
    closeSync(descriptor);
  }

  return hash.digest('hex');
}

const yeriaApp = new YeriaApp({
  appId: 'demo-app-forms',
  viewExpirationMinutes: 30,
  privateKey: DEMO_KEYS.privateKey,
  publicKey: DEMO_KEYS.publicKey,
});


/**
 * Fiche contact — la vue montree sur la page d'accueil de yeria.app.
 *
 * Elle existe pour que l'exemple de code publie soit executable tel quel :
 * quatre lignes de SDK, une vue rendue nativement. Volontairement minimale
 * (nom, prenom, e-mail) — c'est l'exemple d'entree, pas la demonstration
 * exhaustive, qui vit sur `GET /api/forms`.
 */
router.get('/contact', (req: Request, res: Response) => {
  const view = YeriaUI
    .createFormView('contact', 'Nous contacter')
    .setIntro('Laissez vos coordonnées, nous revenons vers vous.')
    .addTextField('lastName', 'Nom', true, 60)
    .addTextField('firstName', 'Prénom', true, 60)
    .addEmailField('email', 'Adresse e-mail', true)
    .submitButton('Envoyer', 'POST');

  res.json(yeriaApp.serve(view));
});

/** Reponse a la fiche contact : un accuse de reception, signe lui aussi. */
/**
 * Réception de la vitrine. Renvoie ce que le serveur a REELLEMENT reçu : c'est
 * la seule façon de vérifier de visu qu'un champ `readonly` est bien transmis
 * et qu'un champ `disabled` ne l'est pas.
 */
router.post('/rich', upload.any(), (req: Request, res: Response) => {
  const body = (req.body ?? {}) as Record<string, unknown>;
  const files = (req.files as Express.Multer.File[] | undefined) ?? [];

  const lines = Object.keys(body)
    .map(k => `• ${k} = ${String(body[k]).slice(0, 60)}`)
    .concat(files.map(f => `• ${f.fieldname} = ${f.originalname} (${f.size} o)`));

  const message = YeriaUI
    .createMessageView('rich-ok', 'Reçu par le serveur', 'success')
    .setBody(
      lines.length
        ? `${lines.join('\n')}\n\n« desactive » ne doit PAS figurer ci-dessus ; « lecture_seule » doit y être.`
        : 'Aucune donnée reçue.'
    );

  res.json(yeriaApp.serve(message));
});

router.post('/contact', (req: Request, res: Response) => {
  const { lastName, firstName, email } = req.body ?? {};

  const missing = ['lastName', 'firstName', 'email'].filter(k => !req.body?.[k]);
  if (missing.length) {
    const error = YeriaUI
      .createMessageView('contact-error', 'Formulaire incomplet', 'error')
      .setBody('Merci de renseigner : nom, prénom et adresse e-mail.');
    return res.status(400).json(yeriaApp.serve(error));
  }

  const message = YeriaUI
    .createMessageView('contact-ok', 'Message reçu', 'success')
    .setBody(`Merci ${firstName} ${lastName}. Nous répondrons à ${email}.`);

  res.json(yeriaApp.serve(message));
});

/**
 * Vitrine des ajouts « formulaire riche ».
 *
 * Chaque nouveauté du SDK y est montree AVEC SON NOM, pour qu'on puisse juger
 * du rendu et pas seulement de l'existence :
 *
 *   - `addParagraph` dans ses trois tailles et ses deux emphases,
 *   - `addSeparator`, deja present mais jamais rendu jusqu'ici,
 *   - un champ en lecture seule et un champ desactive, cote a cote avec leur
 *     equivalent normal pour que la difference se voie,
 *   - un audio et une video DEJA detenus par le fournisseur, jouables mais ni
 *     remplacables ni supprimables,
 *   - `secondaryButton` sous le bouton d'envoi.
 *
 * Volontairement sans scenario : c'est un banc d'essai, pas une demonstration
 * de parcours. Les fichiers pointes sont de vrais medias servis par la
 * redirection `api/media/:name` — une URL fictive donnerait un lecteur muet,
 * qui ne prouverait rien.
 */
const richFormView = (req: Request, res: Response) => {
  // Chemins RELATIFS à la racine du service, comme partout ailleurs dans la
  // démo : le renderer les compose contre la base qu'il connaît déjà. Une URL
  // absolue bâtie sur `req.get('host')` vaudrait « localhost:8051 » — joignable
  // depuis la machine de développement, jamais depuis un téléphone.
  const media = (name: string) => `api/media/${name}`;

  const form = YeriaUI
    .createFormView('form-rich', 'Formulaire riche')
    .setIntro('Chaque bloc ci-dessous porte le nom de ce qu\'il démontre.')

    // ── Blocs de texte ────────────────────────────────────────────────
    .addParagraph('addParagraph — size: xl', { size: 'xl' })
    .addParagraph('size: lg', { size: 'lg' })
    .addParagraph('size: md — taille par défaut', { size: 'md' })
    .addParagraph('size: sm', { size: 'sm' })
    .addParagraph('size: md, bold: true', { bold: true })
    .addParagraph('size: md, italic: true', { italic: true })
    .addParagraph('size: lg, bold + italic', { size: 'lg', bold: true, italic: true })

    .addSeparator('sep-1')
    .addParagraph('addSeparator — le trait ci-dessus. Le type existait déjà côté SDK, mais le mobile le rendait comme un champ texte.', { size: 'sm', italic: true })

    // ── Espacement ────────────────────────────────────────────────────
    .addParagraph('addSpacer — trois crans de vide, rien de dessiné', { size: 'xl' })
    .addParagraph('sm : au-dessous de cette ligne', { size: 'sm', italic: true })
    .addSpacer('sm')
    .addParagraph('md (défaut) : au-dessous de cette ligne', { size: 'sm', italic: true })
    .addSpacer()
    .addParagraph('lg : au-dessous de cette ligne', { size: 'sm', italic: true })
    .addSpacer('lg')
    .addParagraph('Fin des espaces. Un séparateur annonce un groupe, un espace laisse seulement respirer.', { size: 'sm', italic: true })

    // ── État des champs ───────────────────────────────────────────────
    .addParagraph('État des champs', { size: 'xl' })
    .addTextField('normal', 'Champ normal (pour comparer)', false, 60)
    .addField('text', 'lecture_seule', 'readonly — lisible, non modifiable, ENVOYÉ', {
      value: 'Valeur fixée par le fournisseur',
      readonly: true
    })
    .addField('text', 'desactive', 'disabled — estompé et EXCLU de la soumission', {
      value: 'Ne partira pas au serveur',
      disabled: true
    })

    .addSeparator('sep-2')

    // ── Médias déjà détenus ───────────────────────────────────────────
    .addParagraph('Média déjà détenu par le fournisseur', { size: 'xl' })
    .addParagraph('Servis avec value + readonly : la lecture fonctionne, l\'ajout et la suppression disparaissent.', { size: 'sm', italic: true })
    .addAudioField('audio_serveur', 'Audio du serveur (readonly)', false, {
      value: media('SoundHelix-Song-1.mp3'),
      readonly: true
    })
    .addVideoField('video_serveur', 'Vidéo du serveur (readonly)', false, {
      maxDuration: 60,
      value: media('Bee.mp4'),
      readonly: true
    })
    .addParagraph('Et le même champ audio, sans valeur : la capture redevient possible.', { size: 'sm', italic: true })
    .addAudioField('audio_capture', 'Audio à enregistrer (normal)', false, {
      maxDuration: 30,
      minDuration: 1
    })

    .submitButton('Envoyer', 'POST')
    .secondaryButton('secondaryButton — mode navigate', 'api/forms/rich');

  res.json(yeriaApp.serve(form));
};

router.get('/rich', richFormView);

// ---------------------------------------------------------------------
// Formulaires par famille de champs.
//
// Un formulaire unique portait les vingt-six champs : quatre mille pixels de
// haut, impossible a lire sur un telephone et impossible a comparer. Chaque
// famille tient desormais sur un ou deux ecrans, et `/api/forms` en donne
// l'index.
//
// Le decoupage suit ce que le RENDERER fait de different, pas les noms de
// types : les six champs de texte partagent un meme widget et se comparent
// donc bien cote a cote, alors que photo et fichier n'ont rien en commun.
// ---------------------------------------------------------------------

const SUBMIT = 'Soumettre le formulaire';

function formsIndex() {
  const view = YeriaUI
    .createActionListView('forms-index', 'FormView')
    .setIntro('Les types de champs du SDK, par famille. Chaque formulaire tient sur un ecran ou deux.')
    .addAction('api/forms/text', 'Saisie texte',
      'Texte, zone de texte, e-mail, telephone, URL, mot de passe — et deux champs caches')
    .addAction('api/forms/numbers-dates', 'Nombres et dates',
      'Bornes minimum et maximum, selecteur de date')
    .addAction('api/forms/choices', 'Choix',
      'Liste deroulante, presentation radio, cases a cocher')
    .addAction('api/forms/photos', 'Images',
      'Photo simple, capture directe imposee, plusieurs photos')
    .addAction('api/forms/files', 'Fichiers',
      'PDF seul, ou plusieurs formats bureautiques')
    .addAction('api/forms/recordings', 'Enregistrements',
      'Audio et video : duree bornee, source imposee, qualite')
    .addAction('api/forms/theming', 'Identité visuelle — à la carte',
      'Choisissez un thème, une police et des coins : le formulaire revient habillé de vos choix');

  if (devDemosEnabled) {
    view.addAction('api/forms/upload-proof', 'Preuve d\'envoi médias (dev)',
      'Photo, fichier, audio et video : octets reçus, vérifiés et conservés sur disque');
  }

  return view
    .addAction('api/forms/location', 'Localisation',
      'Position GPS et adresse en Plus Code')
    .addAction('api/forms/rich', 'Formulaire riche',
      'Paragraphes, separateur, espaces, etats readonly et disabled, media deja detenu')
    .addAction('api/forms/contact', 'Fiche contact',
      'L\'exemple publie sur la page d\'accueil du site');
}

router.get('/', (req: Request, res: Response) => {
  res.json(yeriaApp.serve(formsIndex()));
});


/**
 * Identite visuelle a la carte.
 *
 * Trois themes prets a l'emploi plus l'identite Yeria par defaut (aucune
 * couleur), une police et une forme de coins a cocher. A l'envoi, le MEME
 * formulaire est resservi par un YeriaApp construit avec ces choix, et un
 * paragraphe detaille la composition retenue (les six cles de `branding`).
 * Personne n'a a connaitre le format d'une couleur : c'est le banc d'essai
 * d'un fournisseur qui veut voir une identite sur l'appareil avant de la
 * figer dans sa configuration.
 */
type ThemePreset = {
  label: string;
  description: string;
  colours?: Pick<ServiceBranding, 'primary' | 'primaryDark' | 'secondary' | 'secondaryDark'>;
};

const THEMING_PRESETS: Record<string, ThemePreset> = {
  yeria: {
    label: 'Yeria (par défaut)',
    description: 'Aucune couleur déclarée.'
  },
  terre: {
    label: 'Terre',
    description: 'Orange brûlé et vert profond.',
    colours: {
      primary: DEMO_BRANDING.primary, primaryDark: DEMO_BRANDING.primaryDark,
      secondary: DEMO_BRANDING.secondary, secondaryDark: DEMO_BRANDING.secondaryDark
    }
  },
  savane: {
    label: 'Savane',
    description: 'Vert forêt et rouge vif.',
    colours: { primary: '#006A4E', primaryDark: '#6FCF97', secondary: '#D21034', secondaryDark: '#FF8A80' }
  },
  ocean: {
    label: 'Océan',
    description: 'Bleu nuit et turquoise.',
    colours: { primary: '#0B3D91', primaryDark: '#8AB4F8', secondary: '#00A6A6', secondaryDark: '#5EEAD4' }
  }
};

const THEMING_FONT_LABELS: Record<string, string> = {
  default: 'Police de l’application (défaut)',
  inter: 'Inter',
  nunito: 'Nunito',
  poppins: 'Poppins',
  serif: 'Serif (Lora)'
};
const THEMING_SHAPE_LABELS: Record<string, string> = {
  rounded: 'Arrondis (défaut)',
  soft: 'Doux',
  square: 'Carrés'
};

type ThemingChoice = { theme: string; font: string; shape: string };
const THEMING_DEFAULT_CHOICE: ThemingChoice = { theme: 'yeria', font: 'default', shape: 'rounded' };

function themingBranding(choice: ThemingChoice): ServiceBranding | undefined {
  const preset = THEMING_PRESETS[choice.theme];
  // Yeria par defaut = aucune identite : la police et les coins n'ont pas
  // de porteur, l'application rend son theme standard.
  if (!preset?.colours) return undefined;
  return {
    ...preset.colours,
    font: choice.font as ServiceBranding['font'],
    shape: choice.shape as ServiceBranding['shape']
  };
}

function themingApp(branding: ServiceBranding | undefined) {
  return new YeriaApp({
    appId: 'demo-app-forms',
    viewExpirationMinutes: 30,
    privateKey: DEMO_KEYS.privateKey,
    publicKey: DEMO_KEYS.publicKey,
    branding
  });
}

function themingComposition(choice: ThemingChoice, branding: ServiceBranding | undefined): string {
  const preset = THEMING_PRESETS[choice.theme];
  if (!branding) {
    return `Identité appliquée : ${preset?.label ?? choice.theme} — aucune clé branding n’est signée, l’application rend son thème standard. Police et coins ne s’appliquent qu’avec un thème coloré.`;
  }
  return [
    `Identité appliquée : ${preset.label}`,
    `primary ${branding.primary} · primaryDark ${branding.primaryDark}`,
    `secondary ${branding.secondary} · secondaryDark ${branding.secondaryDark}`,
    `font ${branding.font} · shape ${branding.shape}`
  ].join('\n');
}

function themingForm(choice: ThemingChoice, composition?: string, error?: string) {
  const view = YeriaUI
    .createFormView('form-theming', 'Identité visuelle')
    .setIntro('Choisissez un thème, une police et des coins. À l’envoi, ce même formulaire revient habillé de vos choix : barre de titre, barre d’action, champs et boutons.');

  if (error) {
    view.addParagraph(error, { size: 'sm', bold: true });
  }
  if (composition) {
    view.addParagraph(composition, { size: 'sm' }).addSeparator();
  }

  view
    .addSelectField('theme', 'Thème', true,
      Object.entries(THEMING_PRESETS).map(([value, preset]) => ({
        value, label: `${preset.label} — ${preset.description}`
      })), 'radio')
    .addSelectField('font', 'Police', true,
      BRANDING_FONTS.map(value => ({ value, label: THEMING_FONT_LABELS[value] ?? value })), 'radio')
    .addSelectField('shape', 'Coins', true,
      BRANDING_SHAPES.map(value => ({ value, label: THEMING_SHAPE_LABELS[value] ?? value })), 'radio')
    .submitButton('Appliquer', 'POST')
    .secondaryButton('Revenir au thème par défaut', 'api/forms/theming');

  view.setFieldValue('theme', choice.theme);
  view.setFieldValue('font', choice.font);
  view.setFieldValue('shape', choice.shape);
  return view;
}

function themingChoiceFromBody(body: Record<string, unknown>): ThemingChoice {
  const pick = (key: keyof ThemingChoice) => {
    const raw = body[key];
    const value = typeof raw === 'string' ? raw.trim() : '';
    return value === '' ? THEMING_DEFAULT_CHOICE[key] : value;
  };
  return { theme: pick('theme'), font: pick('font'), shape: pick('shape') };
}

router.get('/theming', (_req: Request, res: Response) => {
  res.json(yeriaApp.serve(themingForm(THEMING_DEFAULT_CHOICE)));
});

router.post('/theming', upload.any(), (req: Request, res: Response) => {
  const choice = themingChoiceFromBody((req.body ?? {}) as Record<string, unknown>);
  try {
    const branding = themingBranding(choice);
    const app = themingApp(branding);
    res.json(app.serve(themingForm(choice, themingComposition(choice, branding))));
  } catch (error) {
    // Le SDK refuse a la construction (theme inconnu, police hors liste) :
    // le formulaire revient sous le theme par defaut avec le message.
    const message = error instanceof Error ? error.message : String(error);
    res.json(yeriaApp.serve(themingForm(choice, undefined, `Identité refusée — ${message}`)));
  }
});

// Six types de saisie qui passent tous par le meme widget cote mobile : les
// voir ensemble montre ce qui les distingue vraiment — le clavier, le
// masquage, le nombre de lignes.
router.get('/text', (req: Request, res: Response) => {
  const form = YeriaUI
    .createFormView('form-text', 'Saisie texte')
    .setIntro('Six champs rendus par le meme widget. Ce qui change : le clavier, le masquage, le nombre de lignes.')
    .addTextField('username', 'Nom d\'utilisateur', true, 50)
    .addTextField('firstName', 'Prenom', false, 100)
    .addTextAreaField('bio', 'Biographie', false, 10, 500)
    .addEmailField('email', 'Adresse e-mail', true)
    .addPhoneField('phone', 'Numero de telephone', false)
    .addURLField('website', 'Site web', false)
    .addPasswordField('password', 'Mot de passe', 8)
    .addSeparator('sep-hidden')
    .addParagraph('Les deux champs ci-dessous sont caches : ils partent avec la soumission sans jamais etre dessines.', { size: 'sm', italic: true })
    .addHiddenField('referrer', 'Referrer', 'direct')
    .addHiddenField('formVersion', 'Form Version', 'v2.0')
    .submitButton(SUBMIT, 'POST');

  res.json(yeriaApp.serve(form));
});

router.get('/numbers-dates', (req: Request, res: Response) => {
  const form = YeriaUI
    .createFormView('form-numbers-dates', 'Nombres et dates')
    .setIntro('Les bornes sont declarees par le fournisseur ; le client les fait respecter avant l\'envoi.')
    .addNumberField('age', 'Age (18 a 120)', false, 18, 120)
    .addNumberField('quantity', 'Quantite (1 a 100)', true, 1, 100)
    .addDateField('birthdate', 'Date de naissance', false)
    .addDateField('appointmentDate', 'Date de rendez-vous', true)
    .submitButton(SUBMIT, 'POST');

  res.json(yeriaApp.serve(form));
});

// Meme sens — un seul choix parmi plusieurs — trois presentations. Les voir
// ensemble est exactement ce qui permet de choisir la bonne.
router.get('/choices', (req: Request, res: Response) => {
  const form = YeriaUI
    .createFormView('form-choices', 'Choix')
    .setIntro('Un menu deroulant pour beaucoup d\'options, une presentation radio pour une poignee, une case a cocher pour un oui ou non.')
    .addSelectField('country', 'Pays (liste deroulante)', true, [
      { value: 'us', label: 'Etats-Unis' },
      { value: 'ca', label: 'Canada' },
      { value: 'uk', label: 'Royaume-Uni' },
      { value: 'fr', label: 'France' },
      { value: 'de', label: 'Allemagne' }
    ])
    .addSelectField('category', 'Categorie (liste deroulante, facultative)', false, [
      { value: 'tech', label: 'Technologie' },
      { value: 'business', label: 'Business' },
      { value: 'education', label: 'Education' }
    ])
    .addSelectField('gender', 'Genre (presentation radio)', true, [
      { value: 'male', label: 'Homme' },
      { value: 'female', label: 'Femme' },
      { value: 'other', label: 'Autre' },
      { value: 'prefer-not-to-say', label: 'Prefere ne pas dire' }
    ], 'radio')
    .addCheckboxField('newsletter', 'S\'abonner a la lettre d\'information', false)
    .addCheckboxField('terms', 'J\'accepte les conditions d\'utilisation', true)
    .submitButton(SUBMIT, 'POST');

  res.json(yeriaApp.serve(form));
});

router.get('/photos', (req: Request, res: Response) => {
  const form = YeriaUI
    .createFormView('form-photos', 'Images')
    .setIntro('Le fournisseur impose les formats, la source et le nombre. Le client s\'y tient.')
    .addPhotoField('avatar', 'Photo de profil (galerie ou appareil)', false, ['jpeg', 'png'], false)
    .addPhotoField('selfie', 'Selfie en direct (appareil seul)', false, ['jpeg'], true)
    .addPhotoField('gallery', 'Plusieurs photos (4 au plus)', false, ['jpeg', 'png'], false, {
      multiple: true,
      maxCount: 4
    })
    .submitButton(SUBMIT, 'POST');

  res.json(yeriaApp.serve(form));
});

router.get('/files', (req: Request, res: Response) => {
  const form = YeriaUI
    .createFormView('form-files', 'Fichiers')
    .setIntro('Les formats acceptes sont declares champ par champ.')
    .addFileField('resume', 'CV (PDF uniquement)', false, ['application/pdf'])
    .addFileField('document', 'Document (PDF ou Word)', false, [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    ])
    .submitButton(SUBMIT, 'POST');

  res.json(yeriaApp.serve(form));
});

// La duree maximale n'est pas un confort : c'est elle qui borne le poids de
// l'envoi, et c'est sur elle que la limite du serveur est calee.
router.get('/recordings', (req: Request, res: Response) => {
  const form = YeriaUI
    .createFormView('form-recordings', 'Enregistrements')
    .setIntro('Duree bornee, source imposee, qualite : ce que le fournisseur declare, le client l\'applique avant meme d\'envoyer.')
    .addAudioField('voiceNote', 'Note vocale (2 s a 2 min)', false, {
      maxDuration: 120,
      minDuration: 2,
      source: 'both'
    })
    .addAudioField('statement', 'Declaration orale (micro seul)', false, {
      maxDuration: 60,
      minDuration: 3,
      source: 'record'
    })
    .addVideoField('evidence', 'Preuve video (30 s, qualite basse)', false, {
      maxDuration: 30,
      quality: 'low',
      source: 'both',
      maxSize: 16 * 1024 * 1024
    })
    .addVideoField('walkthrough', 'Visite guidee (camera seule, 2 sequences)', false, {
      maxDuration: 20,
      quality: 'medium',
      source: 'record',
      multiple: true,
      maxCount: 2
    })
    .submitButton(SUBMIT, 'POST');

  res.json(yeriaApp.serve(form));
});

// Test end-to-end du transport binaire. Chaque média obligatoire couvre une
// forme de valeur différente produite par le renderer ; la galerie facultative
// couvre en plus les clés indexées des champs multiples.
if (devDemosEnabled) {
  router.get('/upload-proof', (req: Request, res: Response) => {
    const testId = randomUUID();
    const form = YeriaUI
      .createFormView('form-upload-proof', 'Preuve d\'envoi médias')
      .setIntro('Ajoutez ou enregistrez les quatre médias obligatoires. Le serveur les conservera sur disque et calculera leur taille et leur empreinte SHA-256 à partir des octets reçus.')
      .addParagraph(`Identifiant de corrélation : ${testId}`, { size: 'sm', italic: true })
      .addHiddenField('test_id', 'Identifiant du test', testId)
      .addPhotoField('photo_simple', 'Photo simple', true, ['jpeg', 'png'], false)
      .addFileField('document_simple', 'Fichier PDF ou image', true, [
        'application/pdf',
        'image/jpeg',
        'image/png'
      ])
      .addAudioField('audio_record', 'Audio enregistré (2 à 15 s)', true, {
        minDuration: 2,
        maxDuration: 15,
        source: 'record'
      })
      .addVideoField('video_record', 'Vidéo enregistrée (10 s maximum)', true, {
        maxDuration: 10,
        quality: 'low',
        source: 'record',
        maxSize: 8 * 1024 * 1024
      })
      .addPhotoField('photo_multi', 'Deux photos supplémentaires (facultatif)', false, ['jpeg', 'png'], false, {
        multiple: true,
        maxCount: 2,
        source: 'library'
      })
      .submitButton('Envoyer et vérifier', 'POST');

    res.json(yeriaApp.serve(form));
  });

  router.post('/upload-proof', uploadProof.any(), (req: Request, res: Response) => {
    const contentType = req.get('content-type') ?? '';
    const isMultipart = contentType.toLowerCase().startsWith('multipart/form-data;');
    const body = (req.body ?? {}) as Record<string, unknown>;
    const testId = String(body.test_id ?? '');
    const uploads = (req.files as Express.Multer.File[] | undefined) ?? [];
    const requiredParts = ['photo_simple', 'document_simple', 'audio_record', 'video_record'];
    const receivedParts = new Set(uploads.map(file => file.fieldname));

    const receipts = uploads.map(file => {
      const diskSize = statSync(file.path).size;
      const sha256 = sha256File(file.path);
      return {
        field: file.fieldname,
        name: file.originalname,
        mime: file.mimetype,
        size: file.size,
        diskSize,
        path: file.path,
        sha256,
        bytesReceived: file.size > 0 && file.size === diskSize
      };
    });

    const errors = [
      ...(!isMultipart ? ['Le transport reçu n\'est pas multipart/form-data.'] : []),
      ...(!testId ? ['L\'identifiant de corrélation est absent.'] : []),
      ...requiredParts
        .filter(field => !receivedParts.has(field))
        .map(field => `La partie obligatoire « ${field} » est absente.`),
      ...receipts
        .filter(receipt => !receipt.bytesReceived)
        .map(receipt => `La partie « ${receipt.field} » ne contient aucun octet exploitable.`)
    ];
    const valid = errors.length === 0;

    // Le hash n'est calculable qu'après relecture du fichier côté serveur. Le
    // reçu structuré dans les logs permet de corréler cette preuve avec l'écran.
    console.log('Upload proof receipt:', JSON.stringify({
      testId,
      isMultipart,
      valid,
      files: receipts,
      errors
    }));

    const fileLines = receipts.map(receipt =>
      `${receipt.bytesReceived ? '✓' : '✗'} ${receipt.field}\n` +
      `  ${receipt.name} — ${receipt.mime} — ${formatBytes(receipt.size)}\n` +
      `  SHA-256 ${receipt.sha256.slice(0, 16)}…\n` +
      `  Disque : ${receipt.path}`
    );
    const bodyLines = [
      `Transport : ${isMultipart ? 'multipart/form-data' : contentType || 'absent'}`,
      `Test : ${testId || 'absent'}`,
      '',
      ...(fileLines.length > 0 ? fileLines : ['Aucun fichier reçu.']),
      ...(errors.length > 0 ? ['', 'Erreurs :', ...errors.map(error => `• ${error}`)] : [])
    ];

    const message = YeriaUI
      .createMessageView(
        valid ? 'upload-proof-ok' : 'upload-proof-error',
        valid ? 'Preuve d\'envoi validée' : 'Preuve d\'envoi échouée'
      )
      .setSeverity(valid ? 'success' : 'error')
      .setBody(bodyLines.join('\n'))
      .addAction('Retour aux exemples', { back: 1 })
      .addAction('OK');

    res.json(yeriaApp.serve(message));
  });
}

router.get('/location', (req: Request, res: Response) => {
  const form = YeriaUI
    .createFormView('form-location', 'Localisation')
    .setIntro('Deux facons de dire ou, chacune en saisie libre ou en releve par l\'appareil.')

    .addParagraph('Saisie libre', { size: 'lg' })
    .addParagraph('L\'utilisateur tape les valeurs. Le bouton de releve reste disponible pour le Plus Code.', { size: 'sm', italic: true })
    .addGPSField('location', 'Position (latitude et longitude saisies)', false, false)
    .addPlusCodeField('deliveryLocation', 'Adresse de livraison (Plus Code saisi)', false, false)

    .addSeparator('sep-live')
    .addParagraph('Releve par l\'appareil', { size: 'lg' })
    .addParagraph('En mode live, le champ GPS n\'offre plus de saisie : seul le releve remplit la valeur, affichee sans pouvoir etre modifiee. `maxAccuracy` fixe la precision MINIMALE acceptee, en metres — l\'application continue de chercher tant qu\'elle n\'y arrive pas.', { size: 'sm', italic: true })
    .addGPSField('checkin', 'Point de presence (releve seul, 30 m au plus)', false, true, {
      maxAccuracy: 30,
      altitude: true
    })
    .addPlusCodeField('pickup', 'Point de retrait (Plus Code, releve possible)', false, true)

    .submitButton(SUBMIT, 'POST');

  res.json(yeriaApp.serve(form));
});

// Accuse de reception commun a tous les formulaires de famille.
//
// Le client renvoie les valeurs a l'URL D'OU LA VUE VIENT : chaque
// formulaire doit donc avoir son POST, sinon la soumission repond 405. Le
// meme gestionnaire est monte sur tous ces chemins.
//
// Il n'valide RIEN. La version precedente controlait les champs du
// formulaire unique — nom d'utilisateur, e-mail, pays, conditions — et
// rejetait donc tout envoi depuis « Fichiers » ou « Localisation », qui ne
// les portent pas. Le role de la demo est de montrer que les donnees
// arrivent, pas de simuler des regles metier.
//
// `upload.any()` accepts whatever file parts the form declared without the
// route having to restate every fieldId. Text fields still land in req.body;
// captures land in req.files.
const FORM_POST_PATHS = [
  '/',
  '/text',
  '/numbers-dates',
  '/choices',
  '/photos',
  '/files',
  '/recordings',
  '/location',
];

router.post(FORM_POST_PATHS, upload.any(), (req: Request, res: Response) => {
  const formData = req.body ?? {};
  const uploads = (req.files as Express.Multer.File[] | undefined) ?? [];

  console.log('Form submission received:', formData);
  if (uploads.length > 0) {
    console.log(
      'Uploads received:',
      uploads.map(f => `${f.fieldname} (${f.mimetype}, ${f.size} bytes)`)
    );
  }

  // Ce que la demo doit prouver : les valeurs et les captures sont bien
  // arrivees. On les renvoie donc telles quelles.
  const entries = Object.entries(formData)
    .map(([key, value]) => `• ${key} : ${String(value)}`)
    .join('\n');
  const files = uploads
    .map(f => `• ${f.fieldname} (${f.mimetype}, ${formatBytes(f.size)})`)
    .join('\n');

  const parts = [
    entries.length > 0 ? `Champs reçus :\n${entries}` : null,
    files.length > 0 ? `Fichiers reçus :\n${files}` : null,
  ].filter(Boolean);

  const message = YeriaUI
    // Le 3e argument du constructeur est le processId, PAS la gravite : la
    // passer la laissait a « info ». Elle se pose par setSeverity.
    .createMessageView('form-received', 'Données reçues')
    .setSeverity('success')
    .setBody(
      parts.length > 0
        ? parts.join('\n\n')
        : 'Le formulaire est arrivé sans aucune valeur.'
    )
    // Deux boutons, chacun avec son issue : le premier MENE a l'index, le
    // second ferme et laisse l'utilisateur sur son formulaire.
    // `back` ne recharge RIEN : l'index est deja dans la pile, sous le
    // formulaire. Le redemander posait une seconde copie par-dessus, et le
    // geste de retour ramenait sur le formulaire deja soumis.
    .addAction('Retour aux exemples', { back: 1 })
    .addAction('OK');

  res.json(yeriaApp.serve(message));
});

/**
 * Multer rejects an oversized or over-numerous upload by throwing, which the
 * default Express handler turns into an HTML 500 the mobile renderer cannot
 * parse. Answer with a signed MessageView instead, so the user sees why.
 */
router.use((err: unknown, _req: Request, res: Response, next: NextFunction) => {
  if (!(err instanceof multer.MulterError)) return next(err);

  const body = err.code === 'LIMIT_FILE_SIZE'
    ? 'Le fichier envoyé dépasse la taille acceptée par ce service (32 Mo).'
    : `Envoi refusé : ${err.message}`;

  const message = YeriaUI
    .createMessageView('form-upload-error', 'Envoi refusé', 'error')
    .setBody(body);

  res.status(413).json(yeriaApp.serve(message));
});

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} o`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} Ko`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} Mo`;
}

export default router;
