import type { Metadata } from "next";

import { AccountDeletionGuide } from "@/components/legal/account-deletion-guide";

const SUPPORT_EMAIL = "vividxxxxx@gmail.com";
const PLAY_APP_NAME = "clyrtraining | Hyrox Training";
const SERVICE_ENTITY = "CLYR Training / Assist On";

export const metadata: Metadata = {
  title: `${PLAY_APP_NAME} 계정 및 데이터 삭제 요청`,
  description: `Google Play 등록정보에 제공되는 ${PLAY_APP_NAME} 계정 및 관련 데이터 삭제 요청 안내 페이지입니다.`,
};

export default function AccountDeleteGuidePage() {
  return <AccountDeletionGuide appName={PLAY_APP_NAME} serviceEntity={SERVICE_ENTITY} supportEmail={SUPPORT_EMAIL} />;
}
