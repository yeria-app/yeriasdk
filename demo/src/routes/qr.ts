import { Router, Request, Response } from 'express';
import { YeriaApp } from '@numerum-tech/yeriasdk';
import QRCode from 'qrcode';
import { DEMO_KEYS } from '../security/demo-keys';

const router = Router();

const yeriaApp = new YeriaApp({
  appId: 'demo-app-qr',
  viewExpirationMinutes: 30,
  privateKey: DEMO_KEYS.privateKey,
  publicKey: DEMO_KEYS.publicKey
});

// Main QR route - ActionListView showing QR view types
router.get('/', (req: Request, res: Response) => {
  const actionList = yeriaApp
    .createActionListView('qr-types', 'Vues QR - Types de Vues')
    .addAction('/api/qr/scan', 'QRScanView 📷', 'Scanner des codes QR avec validation et prévisualisation', '📱', false)
    .addAction('/api/qr/display', 'QRDisplayView 🔲', 'Afficher un QR code unique', '🖼️', false);

  res.json(yeriaApp.serve(actionList));
});

// Comprehensive QRScanView demonstration
router.get('/scan', (req: Request, res: Response) => {
  const scanner = yeriaApp
    .createQRScanView('comprehensive-qr-scan', 'QRScanView - Démo Complète')
    .setIntro('Cette vue démontre toutes les fonctionnalités de scan QR : auto-submission, validation, prévisualisation et bouton de confirmation')
    .setValidation(
      'Le code doit commencer par "PROD-" suivi de 6 à 12 chiffres',
      'number',
      11,
      17,
      'PROD-'
    )
    .enablePreview(true, 'Code Produit Scanné')
    .submitButton('Vérifier le Produit', 'Confirmer la vérification de ce produit ?');

  res.json(yeriaApp.serve(scanner));
});

// Single QRDisplayView sample — QRDisplayView is single-QR-per-view. The QR is
// supplied by the provider as a self-contained base64 PNG (no external host),
// encoding the text "Yeria SDK".
router.get('/display', async (req: Request, res: Response) => {
  const qrDataUri = await QRCode.toDataURL('Yeria SDK', {
    errorCorrectionLevel: 'H',
    width: 250,
    margin: 1,
  });

  const display = yeriaApp
    .createQRDisplayView('qr-display-sample', 'QR Code Yeria SDK')
    .setIntro('Démonstration de QRDisplayView : un QR code fourni par le service.')
    .setQRCode(
      qrDataUri,
      'Yeria SDK',
      'Ce QR code encode le texte « Yeria SDK ».\n\nScannez-le pour vérifier le rendu.',
      {
        size: 250,
        errorCorrection: 'H'
      }
    )
    .submitButton('Partager', 'POST');

  res.json(yeriaApp.serve(display));
});

export default router;
