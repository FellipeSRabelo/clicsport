// src/components/QRCodeGenerator.jsx
import React, { useEffect, useRef } from 'react';
import QRCodeStyling from 'qr-code-styling';


const QRCodeGenerator = React.forwardRef(({ value, size = 256 }, ref) => {
    const container = useRef();
    const qrCodeInstance = useRef();

    useEffect(() => {
        if (!container.current || !value) return;

        try {
            qrCodeInstance.current = new QRCodeStyling({
                width: size,
                height: size,
                data: value,
                margin: 10,
                type: 'svg',
                shape: 'square',
                cornersDot: {
                    type: 'dot',
                },
                cornersSquare: {
                    type: 'dot',
                },
                dotsOptions: {
                    color: '#1f2937',
                },
                backgroundOptions: {
                    color: '#ffffff',
                },
            });

            // Limpar conteúdo anterior
            container.current.innerHTML = '';
            // Renderizar QR code
            qrCodeInstance.current.append(container.current);

            // Expor instância para o pai
            if (ref) {
                if (typeof ref === 'function') {
                    ref(qrCodeInstance.current);
                } else {
                    ref.current = qrCodeInstance.current;
                }
            }
        } catch (error) {
            console.error('Erro ao gerar QR code:', error);
        }
    }, [value, size, ref]);

    return (
        <div
            ref={container}
            style={{
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
            }}
        />
    );
});

export default QRCodeGenerator;
