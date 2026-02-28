import React, { useState, useRef, useCallback } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import QRCode from 'qrcode';
import { Printer, Download, Check, Heart, Cake, Briefcase } from 'lucide-react';

// Size options in inches and pixels (96 DPI for screen, will scale for print)
const SIZE_OPTIONS = [
  { key: '10x8', label: '10" x 8"', width: 960, height: 768, printWidth: '10in', printHeight: '8in' },
  { key: '8x6', label: '8" x 6"', width: 768, height: 576, printWidth: '8in', printHeight: '6in' }
];

// Printable QR Card Templates for each event type
const QR_CARD_TEMPLATES = {
  wedding: [
    {
      key: 'golden_elegance',
      name: 'Golden Elegance',
      description: 'Classic gold filigree on cream',
      bgColor: '#FDF8F3',
      borderColor: '#D4AF37',
      textColor: '#2C1810',
      accentColor: '#B8960C',
      headerFont: "'Playfair Display', serif",
      style: 'bg_image',
      bgImage: '/templates/golden_elegance.png'
    },
    {
      key: 'botanical_garden',
      name: 'Botanical Garden',
      description: 'Watercolour greenery frame',
      bgColor: '#FFFFFF',
      borderColor: '#7BA883',
      textColor: '#2D3B2E',
      accentColor: '#6B8E6B',
      headerFont: "'Playfair Display', serif",
      style: 'bg_image',
      bgImage: '/templates/botanical_garden.png'
    },
    {
      key: 'midnight_romance',
      name: 'Midnight Romance',
      description: 'Starry navy with gold accents',
      bgColor: '#0F1B33',
      borderColor: '#C5A55A',
      textColor: '#FFFFFF',
      accentColor: '#C5A55A',
      headerFont: "'Playfair Display', serif",
      style: 'bg_image',
      bgImage: '/templates/midnight_romance.png'
    },
    {
      key: 'modern_minimal',
      name: 'Clean Elegant',
      description: 'Plain, sophisticated simplicity',
      bgColor: '#FFFFFF',
      borderColor: '#1A1A1A',
      textColor: '#1A1A1A',
      accentColor: '#666666',
      headerFont: "'Playfair Display', serif",
      style: 'minimal'
    }
  ],
  birthday: [
    {
      key: 'confetti_party',
      name: 'Confetti Party',
      description: 'Colorful and festive',
      bgColor: '#FFF9E6',
      borderColor: '#FF6B9D',
      textColor: '#333333',
      accentColor: '#FF6B9D',
      headerFont: "'Fredoka', sans-serif",
      style: 'confetti'
    },
    {
      key: 'balloon_fun',
      name: 'Balloon Fun',
      description: 'Playful balloon theme',
      bgColor: '#E8F4FD',
      borderColor: '#4ECDC4',
      textColor: '#2C3E50',
      accentColor: '#FF6B6B',
      headerFont: "'Fredoka', sans-serif",
      style: 'balloons'
    },
    {
      key: 'elegant_gold',
      name: 'Elegant Gold',
      description: 'Sophisticated celebration',
      bgColor: '#1A1A2E',
      borderColor: '#FFD700',
      textColor: '#FFFFFF',
      accentColor: '#FFD700',
      headerFont: "'Fredoka', sans-serif",
      style: 'elegant_dark'
    },
    {
      key: 'rainbow_bright',
      name: 'Rainbow Bright',
      description: 'Bold and cheerful',
      bgColor: '#FFFFFF',
      borderColor: '#FF6B6B',
      textColor: '#333333',
      accentColor: '#4ECDC4',
      headerFont: "'Fredoka', sans-serif",
      style: 'rainbow'
    }
  ],
  corporate: [
    {
      key: 'professional_navy',
      name: 'Professional Navy',
      description: 'Corporate excellence',
      bgColor: '#0F2744',
      borderColor: '#3B82F6',
      textColor: '#FFFFFF',
      accentColor: '#60A5FA',
      headerFont: "'Outfit', sans-serif",
      style: 'corporate_dark'
    },
    {
      key: 'clean_white',
      name: 'Clean White',
      description: 'Minimalist professional',
      bgColor: '#FFFFFF',
      borderColor: '#E5E7EB',
      textColor: '#111827',
      accentColor: '#6B7280',
      headerFont: "'Outfit', sans-serif",
      style: 'clean'
    },
    {
      key: 'tech_modern',
      name: 'Tech Modern',
      description: 'Innovation focused',
      bgColor: '#111827',
      borderColor: '#10B981',
      textColor: '#FFFFFF',
      accentColor: '#10B981',
      headerFont: "'Outfit', sans-serif",
      style: 'tech'
    },
    {
      key: 'executive_grey',
      name: 'Executive Grey',
      description: 'Premium business feel',
      bgColor: '#F3F4F6',
      borderColor: '#374151',
      textColor: '#1F2937',
      accentColor: '#4B5563',
      headerFont: "'Outfit', sans-serif",
      style: 'executive'
    }
  ]
};

// Individual QR Card component for printing/download
function QRCard({ template, eventTitle, eventSubtitle, guestUrl, eventType, size, forExport = false }) {
  const sizeConfig = SIZE_OPTIONS.find(s => s.key === size) || SIZE_OPTIONS[0];
  const scale = forExport ? 1 : 0.4; // Scale down for preview
  const width = sizeConfig.width * scale;
  const height = sizeConfig.height * scale;
  const qrSize = Math.min(width, height) * 0.35;

  const getDecorations = () => {
    const cornerSize = width * 0.08;
    switch (template.style) {
      case 'bg_image':
        return null;
      case 'confetti':
        return (
          <>
            <div className="absolute top-4 left-4" style={{ fontSize: width * 0.05 }}>🎉</div>
            <div className="absolute top-4 right-4" style={{ fontSize: width * 0.05 }}>🎊</div>
            <div className="absolute bottom-4 left-4" style={{ fontSize: width * 0.05 }}>🎈</div>
            <div className="absolute bottom-4 right-4" style={{ fontSize: width * 0.05 }}>🎁</div>
          </>
        );
      case 'balloons':
        return (
          <>
            <div className="absolute top-3 left-6" style={{ fontSize: width * 0.06 }}>🎈</div>
            <div className="absolute top-3 right-6" style={{ fontSize: width * 0.06 }}>🎈</div>
          </>
        );
      case 'corporate_dark':
      case 'tech':
        return (
          <>
            <div className="absolute top-0 left-0" style={{ backgroundColor: template.accentColor, width: width * 0.15, height: 4 }} />
            <div className="absolute top-0 right-0" style={{ backgroundColor: template.accentColor, width: width * 0.15, height: 4 }} />
            <div className="absolute bottom-0 left-0" style={{ backgroundColor: template.accentColor, width: width * 0.15, height: 4 }} />
            <div className="absolute bottom-0 right-0" style={{ backgroundColor: template.accentColor, width: width * 0.15, height: 4 }} />
          </>
        );
      default:
        return null;
    }
  };

  return (
    <div
      className="relative flex flex-col items-center justify-between rounded-lg shadow-lg print:shadow-none"
      style={{
        backgroundColor: template.bgColor,
        border: template.bgImage ? 'none' : `4px solid ${template.borderColor}`,
        width: width,
        height: height,
        padding: width * 0.05,
        ...(template.bgImage ? {
          backgroundImage: `url(${template.bgImage})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center'
        } : {})
      }}
    >
      {getDecorations()}
      
      {/* Header */}
      <div className="text-center z-10" style={{ marginTop: height * 0.02 }}>
        <p
          className="uppercase tracking-widest"
          style={{ 
            color: template.accentColor,
            fontSize: width * 0.028
          }}
        >
          {eventType === 'wedding' ? 'Share Your Memories' :
           eventType === 'birthday' ? 'Capture The Fun!' :
           'Event Photos'}
        </p>
        <h2
          className="font-bold leading-tight"
          style={{ 
            color: template.textColor, 
            fontFamily: template.headerFont,
            fontSize: width * 0.055,
            marginTop: height * 0.01
          }}
        >
          {eventTitle || 'Event Name'}
        </h2>
        {eventSubtitle && (
          <p style={{ 
            color: template.accentColor,
            fontSize: width * 0.028,
            marginTop: height * 0.01
          }}>
            {eventSubtitle}
          </p>
        )}
      </div>

      {/* QR Code */}
      <div className="z-10" style={{ margin: `${height * 0.03}px 0` }}>
        <div
          className="rounded-xl"
          style={{ 
            backgroundColor: '#FFFFFF', 
            border: `3px solid ${template.borderColor}`,
            padding: qrSize * 0.1
          }}
        >
          <QRCodeSVG
            value={guestUrl || 'https://example.com'}
            size={qrSize}
            level="H"
            includeMargin={false}
          />
        </div>
      </div>

      {/* Footer */}
      <div className="text-center z-10" style={{ marginBottom: height * 0.02 }}>
        <p
          className="font-medium"
          style={{ 
            color: template.textColor,
            fontSize: width * 0.035
          }}
        >
          Scan to Upload
        </p>
        <p
          style={{ 
            color: template.accentColor,
            fontSize: width * 0.025
          }}
        >
          Photos & Videos
        </p>
        <div className="flex items-center justify-center gap-1" style={{ marginTop: height * 0.02 }}>
          {eventType === 'wedding' && <Heart style={{ color: template.accentColor, width: width * 0.035, height: width * 0.035 }} />}
          {eventType === 'birthday' && <Cake style={{ color: template.accentColor, width: width * 0.035, height: width * 0.035 }} />}
          {eventType === 'corporate' && <Briefcase style={{ color: template.accentColor, width: width * 0.035, height: width * 0.035 }} />}
          <span className="font-medium" style={{ color: template.accentColor, fontSize: width * 0.025 }}>
            SnapVault
          </span>
        </div>
      </div>
    </div>
  );
}

export default function PrintableQRCards({ eventType, eventTitle, eventSubtitle, guestUrl }) {
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [selectedSize, setSelectedSize] = useState('10x8');
  const [downloading, setDownloading] = useState(false);
  const canvasRef = useRef(null);
  
  const templates = QR_CARD_TEMPLATES[eventType] || QR_CARD_TEMPLATES.wedding;
  const sizeConfig = SIZE_OPTIONS.find(s => s.key === selectedSize) || SIZE_OPTIONS[0];

  const handlePrint = useCallback(async () => {
    if (!selectedTemplate) return;

    // Generate QR code data URL locally
    let qrDataUrl;
    try {
      qrDataUrl = await QRCode.toDataURL(guestUrl || 'https://example.com', {
        width: 300,
        errorCorrectionLevel: 'H',
        margin: 1
      });
    } catch {
      qrDataUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(guestUrl)}`;
    }

    const sizeStyle = SIZE_OPTIONS.find(s => s.key === selectedSize);
    const printWindow = window.open('', '', 'width=1000,height=800');
    const printWindow2 = printWindow;
    const sizeStyleRef = sizeStyle;
    
    printWindow2.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Print QR Card - ${eventTitle}</title>
          <link href="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;600;700&family=Fredoka:wght@400;500;600&family=Outfit:wght@400;500;600&display=swap" rel="stylesheet">
          <style>
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body { 
              display: flex; 
              justify-content: center; 
              align-items: center; 
              min-height: 100vh;
              background: #f5f5f5;
            }
            .qr-card {
              width: ${sizeStyleRef.printWidth};
              height: ${sizeStyleRef.printHeight};
              background: ${selectedTemplate.bgColor};
              ${selectedTemplate.bgImage ? `background-image: url(${window.location.origin}${selectedTemplate.bgImage}); background-size: cover; background-position: center;` : `border: 4px solid ${selectedTemplate.borderColor};`}
              border-radius: 12px;
              display: flex;
              flex-direction: column;
              align-items: center;
              justify-content: space-between;
              padding: 5%;
              position: relative;
            }
            .header { text-align: center; margin-top: 2%; }
            .subtitle { color: ${selectedTemplate.accentColor}; font-size: 2.8vmin; text-transform: uppercase; letter-spacing: 0.2em; }
            .title { color: ${selectedTemplate.textColor}; font-family: ${selectedTemplate.headerFont}; font-size: 5.5vmin; font-weight: 700; margin-top: 1%; }
            .event-subtitle { color: ${selectedTemplate.accentColor}; font-size: 2.8vmin; margin-top: 1%; }
            .qr-container { background: white; border: 3px solid ${selectedTemplate.borderColor}; border-radius: 12px; padding: 3%; }
            .footer { text-align: center; margin-bottom: 2%; }
            .scan-text { color: ${selectedTemplate.textColor}; font-size: 3.5vmin; font-weight: 500; }
            .photos-text { color: ${selectedTemplate.accentColor}; font-size: 2.5vmin; }
            .brand { color: ${selectedTemplate.accentColor}; font-size: 2.5vmin; margin-top: 2%; display: flex; align-items: center; justify-content: center; gap: 4px; }
            @media print {
              body { background: white; }
              .qr-card { 
                box-shadow: none !important;
                -webkit-print-color-adjust: exact !important;
                print-color-adjust: exact !important;
              }
            }
          </style>
        </head>
        <body>
          <div class="qr-card">
            <div class="header">
              <p class="subtitle">${eventType === 'wedding' ? 'Share Your Memories' : eventType === 'birthday' ? 'Capture The Fun!' : 'Event Photos'}</p>
              <h2 class="title">${eventTitle || 'Event Name'}</h2>
              ${eventSubtitle ? `<p class="event-subtitle">${eventSubtitle}</p>` : ''}
            </div>
            <div class="qr-container">
              <img src="${qrDataUrl}" alt="QR Code" style="width: 35vmin; height: 35vmin;" />
            </div>
            <div class="footer">
              <p class="scan-text">Scan to Upload</p>
              <p class="photos-text">Photos & Videos</p>
              <p class="brand">SnapVault</p>
            </div>
          </div>
        </body>
      </html>
    `);
    
    printWindow2.document.close();
    printWindow2.focus();
    
    setTimeout(() => {
      printWindow2.print();
      printWindow2.close();
    }, 1000);
  }, [selectedTemplate, selectedSize, guestUrl, eventTitle, eventSubtitle, eventType]);

  const handleDownload = useCallback(async () => {
    if (!selectedTemplate) return;
    setDownloading(true);

    try {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      const scale = 300 / 96; // 300 DPI

      canvas.width = sizeConfig.width * scale;
      canvas.height = sizeConfig.height * scale;
      const W = canvas.width;
      const H = canvas.height;

      // Background - either image or solid color
      if (selectedTemplate.bgImage) {
        const bgImg = new Image();
        bgImg.crossOrigin = 'anonymous';
        await new Promise((resolve, reject) => {
          bgImg.onload = resolve;
          bgImg.onerror = reject;
          bgImg.src = selectedTemplate.bgImage;
        });
        ctx.drawImage(bgImg, 0, 0, W, H);
      } else {
        // Solid background
        ctx.fillStyle = selectedTemplate.bgColor;
        ctx.fillRect(0, 0, W, H);

        // Border
        const bw = 8 * scale;
        ctx.strokeStyle = selectedTemplate.borderColor;
        ctx.lineWidth = bw;
        ctx.strokeRect(bw / 2, bw / 2, W - bw, H - bw);
      }

      // Accent bars for corporate_dark / tech styles
      if (['corporate_dark', 'tech'].includes(selectedTemplate.style)) {
        const barW = W * 0.15;
        ctx.fillStyle = selectedTemplate.accentColor;
        ctx.fillRect(0, 0, barW, 5 * scale);
        ctx.fillRect(W - barW, 0, barW, 5 * scale);
        ctx.fillRect(0, H - 5 * scale, barW, 5 * scale);
        ctx.fillRect(W - barW, H - 5 * scale, barW, 5 * scale);
      }

      ctx.textAlign = 'center';

      // Header subtitle
      const headerText = eventType === 'wedding' ? 'SHARE YOUR MEMORIES' : eventType === 'birthday' ? 'CAPTURE THE FUN!' : 'EVENT PHOTOS';
      ctx.fillStyle = selectedTemplate.accentColor;
      ctx.font = `600 ${28 * scale}px Arial, sans-serif`;
      ctx.letterSpacing = `${4 * scale}px`;
      ctx.fillText(headerText, W / 2, H * 0.09);

      // Title
      ctx.fillStyle = selectedTemplate.textColor;
      ctx.font = `bold ${48 * scale}px Georgia, serif`;
      const title = eventTitle || 'Event Name';
      // Measure and potentially shrink title
      let titleFontSize = 48 * scale;
      ctx.font = `bold ${titleFontSize}px Georgia, serif`;
      while (ctx.measureText(title).width > W * 0.85 && titleFontSize > 20 * scale) {
        titleFontSize -= 2 * scale;
        ctx.font = `bold ${titleFontSize}px Georgia, serif`;
      }
      ctx.fillText(title, W / 2, H * 0.155);

      // Event subtitle
      if (eventSubtitle) {
        ctx.fillStyle = selectedTemplate.accentColor;
        ctx.font = `500 ${28 * scale}px Arial, sans-serif`;
        ctx.fillText(eventSubtitle, W / 2, H * 0.21);
      }

      // Generate QR code locally (no external API)
      const qrDataUrl = await QRCode.toDataURL(guestUrl || 'https://example.com', {
        width: 400,
        errorCorrectionLevel: 'H',
        margin: 1,
        color: { dark: '#000000', light: '#FFFFFF' }
      });

      const qrImg = new Image();
      await new Promise((resolve, reject) => {
        qrImg.onload = resolve;
        qrImg.onerror = reject;
        qrImg.src = qrDataUrl;
      });

      // QR code centered
      const qrSize = Math.min(W, H) * 0.40;
      const qrX = (W - qrSize) / 2;
      const qrY = (H - qrSize) / 2;

      // QR background + border
      const pad = 18 * scale;
      ctx.fillStyle = '#FFFFFF';
      ctx.strokeStyle = selectedTemplate.borderColor;
      ctx.lineWidth = 4 * scale;

      // Rounded rect for QR background
      const rx = qrX - pad, ry = qrY - pad, rw = qrSize + pad * 2, rh = qrSize + pad * 2, r = 12 * scale;
      ctx.beginPath();
      ctx.moveTo(rx + r, ry); ctx.lineTo(rx + rw - r, ry); ctx.quadraticCurveTo(rx + rw, ry, rx + rw, ry + r);
      ctx.lineTo(rx + rw, ry + rh - r); ctx.quadraticCurveTo(rx + rw, ry + rh, rx + rw - r, ry + rh);
      ctx.lineTo(rx + r, ry + rh); ctx.quadraticCurveTo(rx, ry + rh, rx, ry + rh - r);
      ctx.lineTo(rx, ry + r); ctx.quadraticCurveTo(rx, ry, rx + r, ry);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      ctx.drawImage(qrImg, qrX, qrY, qrSize, qrSize);

      // Footer
      ctx.fillStyle = selectedTemplate.textColor;
      ctx.font = `bold ${36 * scale}px Arial, sans-serif`;
      ctx.fillText('Scan to Upload', W / 2, H * 0.84);

      ctx.fillStyle = selectedTemplate.accentColor;
      ctx.font = `500 ${26 * scale}px Arial, sans-serif`;
      ctx.fillText('Photos & Videos', W / 2, H * 0.895);

      ctx.font = `600 ${22 * scale}px Arial, sans-serif`;
      ctx.fillText('SnapVault', W / 2, H * 0.945);

      // Trigger download
      const link = document.createElement('a');
      link.download = `${eventTitle?.replace(/[^a-z0-9]/gi, '_') || 'QR_Card'}_${selectedSize}.png`;
      link.href = canvas.toDataURL('image/png', 1.0);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

    } catch (error) {
      console.error('Download error:', error);
      alert('Failed to download. Please try the Print option instead.');
    } finally {
      setDownloading(false);
    }
  }, [selectedTemplate, selectedSize, sizeConfig, eventTitle, eventSubtitle, eventType, guestUrl]);

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-bold text-slate-900 mb-1">Choose Your Printable QR Card</h3>
        <p className="text-sm text-slate-500">Select a template to print or download - place at your venue for guests to scan</p>
      </div>

      {/* Template Selection Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {templates.map((tmpl) => (
          <button
            key={tmpl.key}
            data-testid={`qr-template-${tmpl.key}`}
            onClick={() => setSelectedTemplate(tmpl)}
            className={`relative rounded-xl overflow-hidden border-2 transition-all hover:shadow-lg ${
              selectedTemplate?.key === tmpl.key
                ? 'border-indigo-500 ring-2 ring-indigo-200'
                : 'border-slate-200 hover:border-indigo-300'
            }`}
          >
            {/* Mini Preview */}
            <div
              className="h-28 p-3 flex flex-col items-center justify-center"
              style={{
                backgroundColor: tmpl.bgColor,
                ...(tmpl.bgImage ? {
                  backgroundImage: `url(${tmpl.bgImage})`,
                  backgroundSize: 'cover',
                  backgroundPosition: 'center'
                } : {})
              }}
            >
              <div
                className="w-10 h-10 rounded-lg mb-2 flex items-center justify-center"
                style={{ backgroundColor: '#fff', border: `2px solid ${tmpl.borderColor}` }}
              >
                <div className="w-6 h-6 bg-slate-300 rounded" />
              </div>
              <p
                className="text-xs font-medium text-center truncate w-full"
                style={{ color: tmpl.textColor, fontFamily: tmpl.headerFont }}
              >
                {tmpl.name}
              </p>
            </div>
            
            {/* Template Info */}
            <div className="p-3 bg-white">
              <p className="font-semibold text-sm text-slate-900">{tmpl.name}</p>
              <p className="text-xs text-slate-500 mt-0.5">{tmpl.description}</p>
            </div>

            {/* Selected Indicator */}
            {selectedTemplate?.key === tmpl.key && (
              <div className="absolute top-2 right-2 w-6 h-6 bg-indigo-600 rounded-full flex items-center justify-center">
                <Check className="w-4 h-4 text-white" />
              </div>
            )}
          </button>
        ))}
      </div>

      {/* Size Selection */}
      {selectedTemplate && (
        <div className="flex items-center gap-4 p-4 bg-slate-50 rounded-xl border border-slate-200">
          <span className="text-sm font-medium text-slate-700">Card Size:</span>
          <div className="flex gap-2">
            {SIZE_OPTIONS.map((size) => (
              <button
                key={size.key}
                data-testid={`size-option-${size.key}`}
                onClick={() => setSelectedSize(size.key)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                  selectedSize === size.key
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'bg-white text-slate-700 border border-slate-200 hover:border-indigo-300'
                }`}
              >
                {size.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Preview & Actions Section */}
      {selectedTemplate && (
        <div className="bg-slate-50 rounded-2xl p-6 border border-slate-200">
          <div className="flex flex-col lg:flex-row gap-6 items-center">
            {/* Preview */}
            <div className="flex-shrink-0 overflow-hidden rounded-lg shadow-md">
              <QRCard
                template={selectedTemplate}
                eventTitle={eventTitle}
                eventSubtitle={eventSubtitle}
                guestUrl={guestUrl}
                eventType={eventType}
                size={selectedSize}
              />
            </div>

            {/* Actions */}
            <div className="flex-1 text-center lg:text-left">
              <h4 className="font-bold text-slate-900 mb-2">Ready to Print or Download!</h4>
              <p className="text-sm text-slate-600 mb-4">
                Your {sizeConfig.label} QR card is ready. Print it or download as a high-quality image.
              </p>
              
              <div className="space-y-2 mb-6">
                <p className="text-xs text-slate-500 flex items-center gap-2">
                  <span>💡</span> <strong>Tip:</strong> Print on card stock for durability
                </p>
                <p className="text-xs text-slate-500 flex items-center gap-2">
                  <span>📱</span> <strong>Tip:</strong> Place at each table or entrance
                </p>
                <p className="text-xs text-slate-500 flex items-center gap-2">
                  <span>🖼️</span> <strong>Tip:</strong> Frame it for an elegant look
                </p>
              </div>

              <div className="flex flex-col sm:flex-row gap-3">
                <button
                  data-testid="download-qr-card-btn"
                  onClick={handleDownload}
                  disabled={downloading}
                  className="flex items-center justify-center gap-2 px-6 py-3 bg-emerald-600 text-white rounded-xl font-semibold text-sm hover:bg-emerald-700 transition-all active:scale-[0.98] disabled:opacity-60"
                >
                  {downloading ? (
                    <>
                      <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      Downloading...
                    </>
                  ) : (
                    <>
                      <Download className="w-5 h-5" />
                      Download ({sizeConfig.label})
                    </>
                  )}
                </button>
                <button
                  data-testid="print-qr-card-btn"
                  onClick={handlePrint}
                  className="flex items-center justify-center gap-2 px-6 py-3 bg-indigo-600 text-white rounded-xl font-semibold text-sm hover:bg-indigo-700 transition-all active:scale-[0.98]"
                >
                  <Printer className="w-5 h-5" />
                  Print Card
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {!selectedTemplate && (
        <div className="bg-slate-50 rounded-2xl p-8 border-2 border-dashed border-slate-200 text-center">
          <div className="w-16 h-16 bg-slate-200 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Download className="w-8 h-8 text-slate-400" />
          </div>
          <p className="text-slate-500 text-sm">Select a template above to preview and download</p>
        </div>
      )}
    </div>
  );
}

export { QR_CARD_TEMPLATES };
