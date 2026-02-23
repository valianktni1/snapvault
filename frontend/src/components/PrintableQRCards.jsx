import React, { useState, useRef } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { Printer, Download, Check, Heart, Cake, Briefcase } from 'lucide-react';

// Printable QR Card Templates for each event type
const QR_CARD_TEMPLATES = {
  wedding: [
    {
      key: 'elegant_frame',
      name: 'Elegant Frame',
      description: 'Classic gold border with script text',
      bgColor: '#FDF8F3',
      borderColor: '#D4AF37',
      textColor: '#2C1810',
      accentColor: '#D4AF37',
      headerFont: "'Playfair Display', serif",
      style: 'elegant'
    },
    {
      key: 'romantic_floral',
      name: 'Romantic Floral',
      description: 'Soft pink with floral corners',
      bgColor: '#FFF5F7',
      borderColor: '#E8B4BC',
      textColor: '#6B2D3D',
      accentColor: '#D4869C',
      headerFont: "'Playfair Display', serif",
      style: 'floral'
    },
    {
      key: 'modern_minimal',
      name: 'Modern Minimal',
      description: 'Clean lines, sophisticated feel',
      bgColor: '#FFFFFF',
      borderColor: '#1A1A1A',
      textColor: '#1A1A1A',
      accentColor: '#666666',
      headerFont: "'Playfair Display', serif",
      style: 'minimal'
    },
    {
      key: 'rustic_kraft',
      name: 'Rustic Charm',
      description: 'Warm kraft paper aesthetic',
      bgColor: '#F5E6D3',
      borderColor: '#8B7355',
      textColor: '#4A3728',
      accentColor: '#6B8E23',
      headerFont: "'Playfair Display', serif",
      style: 'rustic'
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

// Individual QR Card component for printing
function QRCard({ template, eventTitle, eventSubtitle, guestUrl, eventType }) {
  const getDecorations = () => {
    switch (template.style) {
      case 'elegant':
        return (
          <>
            <div className="absolute top-0 left-0 w-16 h-16 border-t-4 border-l-4 rounded-tl-lg" style={{ borderColor: template.borderColor }} />
            <div className="absolute top-0 right-0 w-16 h-16 border-t-4 border-r-4 rounded-tr-lg" style={{ borderColor: template.borderColor }} />
            <div className="absolute bottom-0 left-0 w-16 h-16 border-b-4 border-l-4 rounded-bl-lg" style={{ borderColor: template.borderColor }} />
            <div className="absolute bottom-0 right-0 w-16 h-16 border-b-4 border-r-4 rounded-br-lg" style={{ borderColor: template.borderColor }} />
          </>
        );
      case 'floral':
        return (
          <>
            <div className="absolute top-2 left-2 text-3xl opacity-30">✿</div>
            <div className="absolute top-2 right-2 text-3xl opacity-30">✿</div>
            <div className="absolute bottom-2 left-2 text-3xl opacity-30">✿</div>
            <div className="absolute bottom-2 right-2 text-3xl opacity-30">✿</div>
          </>
        );
      case 'confetti':
        return (
          <>
            <div className="absolute top-3 left-3 text-xl">🎉</div>
            <div className="absolute top-3 right-3 text-xl">🎊</div>
            <div className="absolute bottom-3 left-3 text-xl">🎈</div>
            <div className="absolute bottom-3 right-3 text-xl">🎁</div>
          </>
        );
      case 'balloons':
        return (
          <>
            <div className="absolute top-2 left-4 text-2xl">🎈</div>
            <div className="absolute top-2 right-4 text-2xl">🎈</div>
          </>
        );
      case 'corporate_dark':
      case 'tech':
        return (
          <>
            <div className="absolute top-0 left-0 w-20 h-1" style={{ backgroundColor: template.accentColor }} />
            <div className="absolute top-0 right-0 w-20 h-1" style={{ backgroundColor: template.accentColor }} />
            <div className="absolute bottom-0 left-0 w-20 h-1" style={{ backgroundColor: template.accentColor }} />
            <div className="absolute bottom-0 right-0 w-20 h-1" style={{ backgroundColor: template.accentColor }} />
          </>
        );
      default:
        return null;
    }
  };

  return (
    <div
      className="relative w-[350px] h-[450px] p-6 flex flex-col items-center justify-between rounded-lg shadow-lg print:shadow-none"
      style={{
        backgroundColor: template.bgColor,
        border: `3px solid ${template.borderColor}`
      }}
    >
      {getDecorations()}
      
      {/* Header */}
      <div className="text-center z-10 mt-2">
        <p
          className="text-sm uppercase tracking-widest mb-2"
          style={{ color: template.accentColor }}
        >
          {eventType === 'wedding' ? 'Share Your Memories' :
           eventType === 'birthday' ? 'Capture The Fun!' :
           'Event Photos'}
        </p>
        <h2
          className="text-xl font-bold leading-tight"
          style={{ color: template.textColor, fontFamily: template.headerFont }}
        >
          {eventTitle || 'Event Name'}
        </h2>
        {eventSubtitle && (
          <p className="text-sm mt-1" style={{ color: template.accentColor }}>
            {eventSubtitle}
          </p>
        )}
      </div>

      {/* QR Code */}
      <div className="z-10 my-4">
        <div
          className="p-3 rounded-xl"
          style={{ backgroundColor: '#FFFFFF', border: `2px solid ${template.borderColor}` }}
        >
          <QRCodeSVG
            value={guestUrl || 'https://example.com'}
            size={140}
            level="H"
            includeMargin={false}
          />
        </div>
      </div>

      {/* Footer */}
      <div className="text-center z-10 mb-2">
        <p
          className="text-sm font-medium mb-1"
          style={{ color: template.textColor }}
        >
          Scan to Upload
        </p>
        <p
          className="text-xs"
          style={{ color: template.accentColor }}
        >
          Photos & Videos
        </p>
        <div className="flex items-center justify-center gap-1 mt-3">
          {eventType === 'wedding' && <Heart className="w-4 h-4" style={{ color: template.accentColor }} />}
          {eventType === 'birthday' && <Cake className="w-4 h-4" style={{ color: template.accentColor }} />}
          {eventType === 'corporate' && <Briefcase className="w-4 h-4" style={{ color: template.accentColor }} />}
          <span className="text-xs font-medium" style={{ color: template.accentColor }}>
            SnapVault
          </span>
        </div>
      </div>
    </div>
  );
}

export default function PrintableQRCards({ eventType, eventTitle, eventSubtitle, guestUrl }) {
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const printRef = useRef();
  
  const templates = QR_CARD_TEMPLATES[eventType] || QR_CARD_TEMPLATES.wedding;

  const handlePrint = () => {
    if (!selectedTemplate) return;
    
    const printContent = printRef.current;
    const printWindow = window.open('', '', 'width=800,height=600');
    
    printWindow.document.write(`
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
          ${printContent.innerHTML}
        </body>
      </html>
    `);
    
    printWindow.document.close();
    printWindow.focus();
    
    setTimeout(() => {
      printWindow.print();
      printWindow.close();
    }, 500);
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-bold text-slate-900 mb-1">Choose Your QR Card Design</h3>
        <p className="text-sm text-slate-500">Select a printable template to share with your guests</p>
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
              className="h-32 p-3 flex flex-col items-center justify-center"
              style={{ backgroundColor: tmpl.bgColor }}
            >
              <div
                className="w-12 h-12 rounded-lg mb-2 flex items-center justify-center"
                style={{ backgroundColor: '#fff', border: `2px solid ${tmpl.borderColor}` }}
              >
                <div className="w-8 h-8 bg-slate-200 rounded" />
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

      {/* Preview & Print Section */}
      {selectedTemplate && (
        <div className="bg-slate-50 rounded-2xl p-6 border border-slate-200">
          <div className="flex flex-col lg:flex-row gap-6 items-center">
            {/* Preview */}
            <div ref={printRef} className="flex-shrink-0">
              <QRCard
                template={selectedTemplate}
                eventTitle={eventTitle}
                eventSubtitle={eventSubtitle}
                guestUrl={guestUrl}
                eventType={eventType}
              />
            </div>

            {/* Print Instructions */}
            <div className="flex-1 text-center lg:text-left">
              <h4 className="font-bold text-slate-900 mb-2">Ready to Print!</h4>
              <p className="text-sm text-slate-600 mb-4">
                Print this QR card and place it at your venue. Guests can scan to instantly upload their photos and videos.
              </p>
              
              <div className="space-y-2 mb-6">
                <p className="text-xs text-slate-500">💡 <strong>Tip:</strong> Print on card stock for durability</p>
                <p className="text-xs text-slate-500">📱 <strong>Tip:</strong> Place at each table or entrance</p>
                <p className="text-xs text-slate-500">🖼️ <strong>Tip:</strong> Frame it for an elegant look</p>
              </div>

              <button
                data-testid="print-qr-card-btn"
                onClick={handlePrint}
                className="flex items-center justify-center gap-2 w-full lg:w-auto px-6 py-3 bg-indigo-600 text-white rounded-xl font-semibold text-sm hover:bg-indigo-700 transition-all active:scale-[0.98]"
              >
                <Printer className="w-5 h-5" />
                Print QR Card
              </button>
            </div>
          </div>
        </div>
      )}

      {!selectedTemplate && (
        <div className="bg-slate-50 rounded-2xl p-8 border border-slate-200 text-center">
          <div className="w-16 h-16 bg-slate-200 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Printer className="w-8 h-8 text-slate-400" />
          </div>
          <p className="text-slate-500 text-sm">Select a template above to preview and print</p>
        </div>
      )}
    </div>
  );
}

export { QR_CARD_TEMPLATES };
