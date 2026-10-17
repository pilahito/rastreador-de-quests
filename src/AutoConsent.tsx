/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 pilahito
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

/*
 * QuestTracker — aviso de precaución antes de activar el modo automático.
 *
 * Se muestra UNA vez (hasta que se acepte). Explica qué va a pasar, qué NO hace el plugin
 * y que la posible sanción de Discord es responsabilidad del usuario. Solo si se pulsa
 * "Acepto" se guarda el consentimiento.
 *
 * Shown once, before automation is enabled for the first time. It says what the plugin
 * does, what it never does and that Discord's possible sanction is the user's call.
 */

import { Button } from "@components/Button";
import { RenderModalProps } from "@vencord/discord-types";
import { Modal, openModal } from "@webpack/common";

import { t } from "./i18n";
import { settings } from "./settings";

interface ConsentModalProps {
    modalProps: RenderModalProps;
    onAccepted?: () => void;
}

function ConsentModal({ modalProps, onAccepted }: ConsentModalProps) {
    return (
        <Modal
            {...modalProps}
            size="lg"
            title={`⚠️ ${t("autoConsentTitle")}`}
            actions={[
                {
                    text: t("autoConsentCancel"),
                    variant: "secondary",
                    onClick: () => modalProps.onClose()
                },
                {
                    text: t("autoConsentAccept"),
                    variant: "primary",
                    onClick: () => {
                        settings.store.autoConsent = true;
                        onAccepted?.();
                        modalProps.onClose();
                    }
                }
            ]}
        >
            <div className="vc-qt-root vc-qt-consent">
                <p className="vc-qt-consent-intro">{t("autoConsentIntro")}</p>
                <ul>
                    <li>⚠️ {t("autoConsentBullet1")}</li>
                    <li>🔒 {t("autoConsentBullet2")}</li>
                    <li>🧹 {t("autoConsentBullet3")}</li>
                    <li>🛑 {t("autoConsentBullet4")}</li>
                </ul>
                <div className="vc-qt-consent-actions">
                    <Button
                        size="small"
                        variant="dangerPrimary"
                        onClick={() => {
                            settings.store.autoConsent = true;
                            onAccepted?.();
                            modalProps.onClose();
                        }}
                    >
                        {t("autoConsentAccept")}
                    </Button>
                    <Button size="small" variant="secondary" onClick={() => modalProps.onClose()}>
                        {t("autoConsentCancel")}
                    </Button>
                </div>
            </div>
        </Modal>
    );
}

/** Abre el aviso de riesgo. `onAccepted` solo se llama si el usuario acepta. */
export function openAutoConsent(onAccepted?: () => void): void {
    openModal(modalProps => <ConsentModal modalProps={modalProps} onAccepted={onAccepted} />);
}
