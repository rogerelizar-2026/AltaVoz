import { useState, useEffect } from "react";
import { Modal } from "./ui";
import { IcLock, IcLogout } from "./icons";

const CONTACT_EMAIL = "rogerelizar@gmail.com";

interface PasswordModalProps {
  open: boolean;
  onAuthenticated: () => void;
  onExit: () => void;
}

export function PasswordModal({ open, onAuthenticated, onExit }: PasswordModalProps) {
  const [showExitMessage, setShowExitMessage] = useState(false);

  // Reset state when modal opens/closes
  useEffect(() => {
    if (!open) {
      setShowExitMessage(false);
    }
  }, [open]);

  const handleEnter = () => {
    onAuthenticated();
  };

  const handleExitClick = () => {
    // Mostra mensagem de saída e redireciona após 4 segundos
    setShowExitMessage(true);
    setTimeout(() => {
      window.location.href = "/";
    }, 4000);
  };

  // Se deve mostrar mensagem de saída
  if (showExitMessage) {
    return (
      <Modal
        open={open}
        onClose={() => {}}
        title="Saída do Sistema"
        icon={<IcLogout size={24} className="text-warn-400" />}
        width="max-w-md"
      >
        <div className="space-y-4 text-center">
          <p className="text-mist-300 text-lg">
            Olá! Você pode solicitar o acesso no email{" "}
            <a 
              href={`mailto:${CONTACT_EMAIL}`} 
              className="underline hover:text-brand-300 transition-colors font-semibold"
            >
              {CONTACT_EMAIL}
            </a>
          </p>
          <p className="text-sm text-ink-500">
            Redirecionando para a página inicial...
          </p>
        </div>
      </Modal>
    );
  }

  return (
    <Modal
      open={open}
      onClose={() => {}}
      title="Aviso de Uso"
      icon={<IcLock size={24} className="text-brand-400" />}
      width="max-w-md"
    >
      <div className="space-y-4">
        {/* Mensagem de aviso */}
        <div className="rounded-lg border border-warn-400/30 bg-warn-400/8 px-4 py-3 text-sm text-warn-300">
          <p className="font-semibold text-mist-100 mb-1">Uso pessoal</p>
          <p>
            Este sistema é destinado exclusivamente para{" "}
            <strong>uso pessoal</strong>. 
            Para solicitar acesso, entre em contato com{" "}
            <a 
              href={`mailto:${CONTACT_EMAIL}`} 
              className="underline hover:text-brand-300 transition-colors"
            >
              {CONTACT_EMAIL}
            </a>
            .
          </p>
        </div>

        {/* Botões */}
        <div className="flex gap-3 pt-2">
          <button
            onClick={handleExitClick}
            className="flex-1 inline-flex items-center justify-center gap-2 rounded-lg border border-ink-600 bg-ink-750 px-4 py-2.5 text-sm font-medium text-mist-200 transition-all hover:border-warn-400/50 hover:text-warn-300 active:scale-[0.98] cursor-pointer select-none"
          >
            <IcLogout size={16} />
            Sair
          </button>
          <button
            onClick={handleEnter}
            className="flex-1 inline-flex items-center justify-center gap-2 rounded-lg bg-brand-400 px-4 py-2.5 text-sm font-semibold text-ink-950 transition-all hover:bg-brand-300 active:scale-[0.98] cursor-pointer select-none shadow-[0_2px_16px_rgba(245,184,75,0.25)]"
          >
            Entrar
          </button>
        </div>
      </div>
    </Modal>
  );
}

interface ExitConfirmModalProps {
  open: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ExitConfirmModal({ open, onConfirm, onCancel }: ExitConfirmModalProps) {
  return (
    <Modal
      open={open}
      onClose={onCancel}
      title="Confirmar Saída"
      icon={<IcLogout size={24} className="text-warn-400" />}
      width="max-w-sm"
    >
      <div className="space-y-4">
        <p className="text-mist-300">
          Deseja realmente sair do sistema? Você perderá todo o progresso não salvo.
        </p>
        
        <div className="flex gap-3 pt-2">
          <button
            onClick={onCancel}
            className="flex-1 inline-flex items-center justify-center gap-2 rounded-lg border border-ink-600 bg-ink-750 px-4 py-2.5 text-sm font-medium text-mist-200 transition-all hover:border-ink-500 active:scale-[0.98] cursor-pointer select-none"
          >
            Cancelar
          </button>
          <button
            onClick={onConfirm}
            className="flex-1 inline-flex items-center justify-center gap-2 rounded-lg bg-warn-400 px-4 py-2.5 text-sm font-semibold text-ink-950 transition-all hover:bg-warn-300 active:scale-[0.98] cursor-pointer select-none"
          >
            Sair
          </button>
        </div>
      </div>
    </Modal>
  );
}
