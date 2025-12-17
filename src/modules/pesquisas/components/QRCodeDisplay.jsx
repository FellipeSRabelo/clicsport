import React, { useEffect, useRef } from 'react';
import QRCodeStyling from 'qr-code-styling';

export default function QRCodeDisplay({ qrRef, url }) {
  const qrContainerRef = useRef(null);

  useEffect(() => {
    if (url && qrContainerRef.current) {
      // Limpar container anterior
      qrContainerRef.current.innerHTML = '';

      const qrCode = new QRCodeStyling({
        width: 320,
        height: 320,
        data: url,
        image: 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"%3E%3Crect fill="%23000" width="100" height="100"/%3E%3C/svg%3E',
        margin: 10,
        qrOptions: {
          typeNumber: 0,
          mode: 'Byte',
          errorCorrectionLevel: 'H'
        },
        imageOptions: {
          hideBackgroundDots: true,
          imageSize: 0.2,
          margin: 0
        },
        dotsOptions: {
          color: '#000000',
          type: 'square'
        },
        backgroundOptions: {
          color: '#ffffff'
        },
        cornersSquareOptions: {
          color: '#000000',
          type: 'square'
        },
        cornersDotOptions: {
          color: '#000000',
          type: 'dot'
        }
      });

      qrCode.append(qrContainerRef.current);
    }
  }, [url]);

  const downloadQRCode = async () => {
    if (qrRef?.current) {
      try {
        // Create a link element and trigger download
        const link = document.createElement('a');
        link.href = await qrRef.current?.toDataUrl('png');
        link.download = 'pesquisa_qrcode.png';
        link.click();
      } catch (err) {
        console.error('Erro ao baixar QR Code:', err);
        alert('Erro ao baixar QR Code');
      }
    }
  };

  return (
    <div>
      <h3 className="text-2xl font-semibold mb-6 text-center">Escaneie para Responder</h3>
      <div
        ref={qrContainerRef}
        className="flex justify-center p-4 border rounded-sm"
        style={{ minHeight: '360px' }}
      />
      <p className="text-center text-gray-500 text-sm mt-4 break-all">{url}</p>
      <button
        onClick={downloadQRCode}
        className="w-full mt-6 py-2 px-4 bg-blue-600 text-white rounded-sm hover:bg-blue-700 transition-colors"
      >
        Baixar Imagem (PNG)
      </button>
    </div>
  );
}
