import { useLanguageStore } from '../stores/languageStore'

export const useTranslation = () => {
  const language = useLanguageStore(state => state.language)
  const t = useLanguageStore(state => state.t)
  return { t, language }
}
