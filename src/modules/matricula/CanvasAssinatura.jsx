import React, { useEffect, useRef, useState } from 'react';

const CanvasAssinatura = ({ onCapture, onClear }) => {
  const canvasRef = useRef(null);
  const isDrawing = useRef(false);
  const lastX = useRef(0);
  const lastY = useRef(0);
  const [statusMessage, setStatusMessage] = useState('');

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const resizeCanvas = () => {
      const rect = canvas.getBoundingClientRect();
      // Mantém o canvas com o mesmo tamanho CSS para evitar deslocamento em touch
      canvas.width = rect.width;
      canvas.height = rect.height;
    };

    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);
    return () => window.removeEventListener('resize', resizeCanvas);
  }, []);

  const getCoordinates = (event) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    const clientX = event.clientX ?? event.touches?.[0]?.clientX ?? 0;
    const clientY = event.clientY ?? event.touches?.[0]?.clientY ?? 0;
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    return {
      x: (clientX - rect.left) * scaleX,
      y: (clientY - rect.top) * scaleY,
    };
  };

  const handlePointerDown = (e) => {
    e.preventDefault();
    isDrawing.current = true;
    const { x, y } = getCoordinates(e);
    lastX.current = x;
    lastY.current = y;
    canvasRef.current?.setPointerCapture?.(e.pointerId);
  };

  const handlePointerMove = (e) => {
    if (!isDrawing.current) return;
    e.preventDefault();
    const { x, y } = getCoordinates(e);
    const ctx = canvasRef.current?.getContext('2d');
    if (!ctx) return;
    ctx.lineWidth = 3;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.strokeStyle = '#111827';
    ctx.beginPath();
    ctx.moveTo(lastX.current, lastY.current);
    ctx.lineTo(x, y);
    ctx.stroke();
    lastX.current = x;
    lastY.current = y;
  };

  const handlePointerUp = (e) => {
    if (isDrawing.current) {
      canvasRef.current?.releasePointerCapture?.(e.pointerId);
    }
    isDrawing.current = false;
  };

  const isCanvasBlank = () => {
    const canvas = canvasRef.current;
    if (!canvas) return true;
    const ctx = canvas.getContext('2d');
    const pixelBuffer = new Uint32Array(
      ctx.getImageData(0, 0, canvas.width, canvas.height).data.buffer
    );
    return !pixelBuffer.some((color) => color !== 0);
  };

  const handleCapture = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    if (isCanvasBlank()) {
      setStatusMessage('Desenhe sua assinatura antes de salvar.');
      return;
    }
    const imageData = canvas.toDataURL('image/png');
    onCapture?.(imageData);
    setStatusMessage('Assinatura salva com sucesso!');
  };

  const handleClear = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    onClear && onClear();
    setStatusMessage('');
  };

  return (
    <div className="flex flex-col gap-4">
      <label className="block text-sm font-medium text-gray-700">
        Assinatura Digital
      </label>
      <p className="text-xs text-gray-500">
        Assine na linha abaixo, clique no botão "Salvar" para salvar a assinatura:
      </p>
      <canvas
        ref={canvasRef}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerLeave={handlePointerUp}
        className="border-2 border-gray-300 rounded-lg bg-white cursor-crosshair touch-none w-full h-48"
        style={{
          touchAction: 'none',
          backgroundImage:
            'linear-gradient(to bottom, transparent calc(50% - 1px), #cbd5f5 calc(50% - 1px), #cbd5f5 calc(50% + 1px), transparent calc(50% + 1px))',
        }}
      />
      <div className="flex gap-2">
        <button
          type="button"
          onClick={handleClear}
          className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition"
        >
          Limpar
        </button>
        <button
          type="button"
          onClick={handleCapture}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
        >
          Salvar
        </button>
      </div>
      {statusMessage && (
        <p className={`text-xs ${statusMessage.includes('sucesso') ? 'text-green-600' : 'text-red-600'}`}>
          {statusMessage}
        </p>
      )}
    </div>
  );
};

export default CanvasAssinatura;
