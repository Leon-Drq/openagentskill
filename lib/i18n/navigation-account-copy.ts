import type { Locale } from './config'

const copy: Record<Locale, { login: string; signup: string; account: string; profile: string; saved: string; signout: string; signoutError: string; community: string }> = {
  en: { login: 'Log in', signup: 'Sign up free', account: 'Your account', profile: 'My profile', saved: 'Saved skills', signout: 'Log out', signoutError: 'Could not log out. Please try again.', community: 'Community' },
  zh: { login: '登录', signup: '免费注册', account: '我的账户', profile: '个人资料', saved: '收藏的技能', signout: '退出登录', signoutError: '退出失败，请重试。', community: '社区与合作' },
  ja: { login: 'ログイン', signup: '無料登録', account: 'アカウント', profile: 'プロフィール', saved: '保存したスキル', signout: 'ログアウト', signoutError: 'ログアウトできませんでした。再度お試しください。', community: 'コミュニティ' },
  ko: { login: '로그인', signup: '무료 가입', account: '내 계정', profile: '내 프로필', saved: '저장한 스킬', signout: '로그아웃', signoutError: '로그아웃하지 못했습니다. 다시 시도해 주세요.', community: '커뮤니티' },
  es: { login: 'Iniciar sesión', signup: 'Registro gratis', account: 'Tu cuenta', profile: 'Mi perfil', saved: 'Skills guardados', signout: 'Cerrar sesión', signoutError: 'No se pudo cerrar la sesión. Inténtalo de nuevo.', community: 'Comunidad' },
  de: { login: 'Anmelden', signup: 'Kostenlos registrieren', account: 'Dein Konto', profile: 'Mein Profil', saved: 'Gespeicherte Skills', signout: 'Abmelden', signoutError: 'Abmeldung fehlgeschlagen. Bitte erneut versuchen.', community: 'Community' },
  fr: { login: 'Connexion', signup: 'Inscription gratuite', account: 'Votre compte', profile: 'Mon profil', saved: 'Skills enregistrés', signout: 'Déconnexion', signoutError: 'Échec de la déconnexion. Veuillez réessayer.', community: 'Communauté' },
  id: { login: 'Masuk', signup: 'Daftar gratis', account: 'Akun Anda', profile: 'Profil saya', saved: 'Skill tersimpan', signout: 'Keluar', signoutError: 'Gagal keluar. Silakan coba lagi.', community: 'Komunitas' },
}

export const getNavigationAccountCopy = (locale: Locale) => copy[locale]
