import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  CreditCard, 
  Plus, 
  Trash2, 
  Check, 
  ArrowLeft,
  X,
  Lock,
  Globe
} from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useLanguageStore } from '../stores/languageStore'
import toast from 'react-hot-toast'

const Payments = () => {
  const { t } = useLanguageStore()
  const navigate = useNavigate()
  const [cards, setCards] = useState([])
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [formData, setFormData] = useState({
    card_holder: '',
    card_number: '',
    expiry: '',
    cvv: '',
    card_type: 'visa',
    is_default: false
  })

  // Load cards from localStorage on mount
  useEffect(() => {
    const savedCards = localStorage.getItem('ozo-saved-cards')
    if (savedCards) {
      const parsed = JSON.parse(savedCards)
      // Filter out dummy card-1 and card-2 if they were saved in the user's browser previously
      const filtered = parsed.filter(c => c.id !== 'card-1' && c.id !== 'card-2')
      setCards(filtered)
      localStorage.setItem('ozo-saved-cards', JSON.stringify(filtered))
    } else {
      setCards([])
      localStorage.setItem('ozo-saved-cards', JSON.stringify([]))
    }
  }, [])

  const saveCardsToStorage = (updatedCards) => {
    setCards(updatedCards)
    localStorage.setItem('ozo-saved-cards', JSON.stringify(updatedCards))
  }

  const openAddModal = () => {
    setFormData({
      card_holder: '',
      card_number: '',
      expiry: '',
      cvv: '',
      card_type: 'visa',
      is_default: cards.length === 0
    })
    setIsModalOpen(true)
  }

  const detectCardType = (number) => {
    const clean = number.replace(/\s+/g, '')
    if (clean.startsWith('4')) return 'visa'
    if (clean.match(/^5[1-5]/)) return 'mastercard'
    if (clean.match(/^3[47]/)) return 'amex'
    return 'visa' // Default fallback
  }

  const formatCardNumber = (value) => {
    const v = value.replace(/\s+/g, '').replace(/[^0-9]/gi, '')
    const matches = v.match(/\d{4,16}/g)
    const match = (matches && matches[0]) || ''
    const parts = []

    for (let i = 0, len = match.length; i < len; i += 4) {
      parts.push(match.substring(i, i + 4))
    }

    if (parts.length > 0) {
      return parts.join(' ')
    } else {
      return v
    }
  }

  const formatExpiry = (value) => {
    const clean = value.replace(/[^0-9]/g, '')
    if (clean.length >= 2) {
      return `${clean.slice(0, 2)}/${clean.slice(2, 4)}`
    }
    return clean
  }

  const handleSubmit = (e) => {
    e.preventDefault()

    const cleanNum = formData.card_number.replace(/\s+/g, '')
    if (cleanNum.length < 16) {
      toast.error('Invalid Card Number')
      return
    }

    const expiryMatch = formData.expiry.match(/^(0[1-9]|1[0-2])\/?([0-9]{2})$/)
    if (!expiryMatch) {
      toast.error('Invalid Expiry Date (MM/YY)')
      return
    }

    if (formData.cvv.length < 3) {
      toast.error('Invalid CVV')
      return
    }

    const newCard = {
      id: `card-${Date.now()}`,
      card_holder: formData.card_holder,
      card_number: `•••• •••• •••• ${cleanNum.slice(-4)}`,
      expiry: formData.expiry,
      card_type: detectCardType(formData.card_number),
      is_default: formData.is_default
    }

    let updatedCards = [...cards]
    if (newCard.is_default) {
      updatedCards = updatedCards.map(c => ({ ...c, is_default: false }))
    }
    updatedCards.push(newCard)

    saveCardsToStorage(updatedCards)
    setIsModalOpen(false)
    toast.success('Card added successfully')
  }

  const handleDelete = (id, e) => {
    e.stopPropagation()
    if (window.confirm('Are you sure you want to delete this card?')) {
      const updatedCards = cards.filter(c => c.id !== id)
      // If we deleted the default, set first card as default
      if (updatedCards.length > 0 && !updatedCards.some(c => c.is_default)) {
        updatedCards[0].is_default = true
      }
      saveCardsToStorage(updatedCards)
      toast.success('Card removed successfully')
    }
  }

  const handleSetDefault = (cardId) => {
    const updatedCards = cards.map(c => ({
      ...c,
      is_default: c.id === cardId
    }))
    saveCardsToStorage(updatedCards)
    toast.success('Default payment method updated')
  }

  const renderTitle = (titleString) => {
    if (!titleString) return null
    const words = titleString.trim().split(/\s+/)
    if (words.length <= 1) {
      return <>{titleString}<span className="text-gradient">.</span></>
    }
    const firstPart = words.slice(0, -1).join(' ')
    const lastWord = words[words.length - 1]
    return <>{firstPart} <span className="text-gradient">{lastWord}.</span></>
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-[#0a0a0a] pb-32 md:pb-24 transition-colors duration-300">
      {/* Header */}
      <div className="page-header-sticky">
        <div className="container-custom">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <button 
                onClick={() => navigate(-1)} 
                className="p-2 hover:bg-gray-100 dark:hover:bg-white/5 rounded-xl transition-colors"
              >
                <ArrowLeft size={24} className="text-gray-900 dark:text-white" />
              </button>
              <div>
                <h1 className="text-2xl md:text-3xl font-display font-black text-gray-900 dark:text-white">
                  {renderTitle(t('paymentMethods') || 'Payment Methods')}
                </h1>
                <p className="text-xs md:text-sm text-ozo-gray dark:text-gray-400 font-medium">
                  Manage your credit and debit cards
                </p>
              </div>
            </div>
            
            <button 
              onClick={openAddModal}
              className="flex items-center gap-2 px-4 py-2.5 md:px-6 md:py-3.5 bg-gradient-ozo text-white rounded-2xl font-black text-xs md:text-sm shadow-ozo hover:scale-105 active:scale-95 transition-all whitespace-nowrap"
            >
              <Plus size={16} md:size={18} strokeWidth={3} /> Add Card
            </button>
          </div>
        </div>
      </div>

      <div className="container-custom py-6 md:py-12">
        <div className="max-w-4xl mx-auto">
          {cards.length === 0 ? (
            <div className="text-center py-10 md:py-20 bg-white dark:bg-[#1a1a1a] rounded-[2rem] md:rounded-[2.5rem] p-6 md:p-8 border border-gray-100 dark:border-white/5">
              <div className="w-16 h-16 md:w-20 md:h-20 bg-orange-50 dark:bg-orange-500/10 text-orange-500 rounded-[1.5rem] md:rounded-[1.8rem] flex items-center justify-center mx-auto mb-6">
                <CreditCard size={32} md:size={40} />
              </div>
              <h3 className="text-xl md:text-2xl font-black mb-2 text-gray-900 dark:text-white">No Saved Cards</h3>
              <p className="text-xs md:text-sm text-ozo-gray dark:text-gray-400 font-medium max-w-sm mx-auto mb-6 md:mb-8">
                Save your cards for faster checkouts. All transactions are securely encrypted.
              </p>
              <button 
                onClick={openAddModal}
                className="px-6 py-3.5 md:px-8 md:py-4 bg-gradient-ozo text-white rounded-2xl font-black text-xs md:text-sm shadow-ozo hover:scale-105 active:scale-95 transition-all"
              >
                Add Your First Card
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {cards.map((card) => (
                <div 
                  key={card.id}
                  onClick={() => handleSetDefault(card.id)}
                  className={`relative p-8 rounded-[2.5rem] overflow-hidden cursor-pointer shadow-md transition-all duration-300 group hover:shadow-2xl ${
                    card.is_default 
                      ? 'bg-gradient-to-br from-[#1c1c1c] to-[#0a0a0a] text-white border-2 border-ozo-red/20' 
                      : 'bg-white dark:bg-[#1a1a1a] text-gray-800 dark:text-white border border-gray-100 dark:border-white/5 hover:border-gray-200 dark:hover:border-white/10'
                  }`}
                >
                  {/* Card Background elements */}
                  <div className="absolute top-0 right-0 w-48 h-48 bg-white/5 rounded-full blur-3xl -mr-12 -mt-12 group-hover:scale-110 transition-transform duration-500" />
                  
                  <div className="relative z-10 flex flex-col justify-between h-44">
                    {/* Header */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Lock size={16} className={card.is_default ? 'text-ozo-red' : 'text-gray-400'} />
                        <span className="text-[10px] font-black uppercase tracking-widest opacity-60">Secure Card</span>
                      </div>
                      
                      {/* Logo type */}
                      <span className="text-lg font-black italic tracking-wider uppercase font-display">
                        {card.card_type === 'visa' && <span className="text-[#3b82f6]">Visa</span>}
                        {card.card_type === 'mastercard' && <span className="text-[#ef4444]">Mastercard</span>}
                        {card.card_type === 'amex' && <span className="text-[#10b981]">Amex</span>}
                      </span>
                    </div>

                    {/* Card Number */}
                    <p className="text-xl font-bold font-mono tracking-widest py-3">
                      {card.card_number}
                    </p>

                    {/* Footer */}
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-[9px] uppercase tracking-wider opacity-60">Card Holder</p>
                        <p className="font-black text-sm">{card.card_holder}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-[9px] uppercase tracking-wider opacity-60">Expires</p>
                        <p className="font-bold text-sm">{card.expiry}</p>
                      </div>
                    </div>
                  </div>

                  {/* Badges / Actions */}
                  <div className="absolute top-6 right-6 flex items-center gap-2 z-20">
                    {card.is_default && (
                      <span className="text-[9px] uppercase tracking-wider font-black text-white bg-ozo-red px-2.5 py-0.5 rounded-full">
                        Primary
                      </span>
                    )}
                    
                    {!card.is_default && (
                      <button 
                        onClick={(e) => handleDelete(card.id, e)}
                        className="p-2 bg-red-50 dark:bg-ozo-red/10 text-ozo-red hover:bg-ozo-red hover:text-white rounded-xl transition-all opacity-0 group-hover:opacity-100"
                        title="Delete Card"
                      >
                        <Trash2 size={12} />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Secure gateway trust badge */}
          <div className="mt-6 md:mt-12 flex items-center justify-center gap-3 px-6 py-4 md:py-6 bg-white dark:bg-[#1a1a1a] rounded-[2rem] md:rounded-[2.5rem] border border-gray-100 dark:border-white/5">
            <Lock size={16} className="text-ozo-green flex-shrink-0" />
            <p className="text-[10px] md:text-xs font-black text-gray-500 dark:text-gray-400 uppercase tracking-widest text-center leading-relaxed">
              PCI-DSS Compliant 256-Bit SSL Encryption
            </p>
          </div>
        </div>
      </div>

      {/* Add Card Modal */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsModalOpen(false)}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            />

            {/* Modal Content */}
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="bg-white dark:bg-[#1a1a1a] rounded-[2.5rem] p-8 shadow-2xl border border-gray-100 dark:border-white/5 w-full max-w-md relative z-10 text-gray-800 dark:text-white"
            >
              <button
                onClick={() => setIsModalOpen(false)}
                className="absolute top-6 right-6 p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-white/5 text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
              >
                <X size={20} />
              </button>

              <h3 className="text-2xl font-black mb-2 flex items-center gap-3">
                <span className="w-1.5 h-6 bg-ozo-red rounded-full" />
                Add New Card
              </h3>
              <p className="text-sm text-ozo-gray dark:text-gray-400 font-medium mb-6">
                Enter your card details safely.
              </p>

              <form onSubmit={handleSubmit} className="space-y-5">
                {/* Holder Name */}
                <div>
                  <label className="label">Card Holder Name</label>
                  <input
                    type="text"
                    value={formData.card_holder}
                    onChange={(e) => setFormData({ ...formData, card_holder: e.target.value })}
                    className="input"
                    placeholder="Full Name as on Card"
                    required
                  />
                </div>

                {/* Card Number */}
                <div>
                  <label className="label">Card Number</label>
                  <div className="relative">
                    <input
                      type="text"
                      maxLength="19"
                      value={formData.card_number}
                      onChange={(e) => setFormData({ 
                        ...formData, 
                        card_number: formatCardNumber(e.target.value) 
                      })}
                      className="input pr-12"
                      placeholder="0000 0000 0000 0000"
                      required
                    />
                    <div className="absolute right-4 top-1/2 -translate-y-1/2 flex items-center">
                      <CreditCard size={20} className="text-gray-400" />
                    </div>
                  </div>
                </div>

                {/* Expiry and CVV */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="label">Expiry Date</label>
                    <input
                      type="text"
                      maxLength="5"
                      value={formData.expiry}
                      onChange={(e) => setFormData({ 
                        ...formData, 
                        expiry: formatExpiry(e.target.value) 
                      })}
                      className="input"
                      placeholder="MM/YY"
                      required
                    />
                  </div>
                  <div>
                    <label className="label">CVV / CVC</label>
                    <input
                      type="password"
                      maxLength="4"
                      value={formData.cvv}
                      onChange={(e) => setFormData({ ...formData, cvv: e.target.value.replace(/[^0-9]/g, '') })}
                      className="input"
                      placeholder="•••"
                      required
                    />
                  </div>
                </div>

                {/* Set default checkbox */}
                <div className="flex items-center gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, is_default: !formData.is_default })}
                    className={`w-6 h-6 rounded-lg border flex items-center justify-center transition-all ${
                      formData.is_default 
                        ? 'bg-ozo-green border-ozo-green text-white' 
                        : 'border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-white/5'
                    }`}
                  >
                    {formData.is_default && <Check size={14} strokeWidth={3} />}
                  </button>
                  <span className="text-sm font-bold text-gray-700 dark:text-gray-300">Set as default payment method</span>
                </div>

                {/* Action Buttons */}
                <div className="flex justify-end gap-4 pt-4 border-t border-gray-100 dark:border-white/5">
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="px-6 py-3.5 bg-gray-50 dark:bg-white/5 text-gray-700 dark:text-gray-300 font-black rounded-xl hover:bg-gray-100 dark:hover:bg-white/10 transition-all text-sm"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-10 py-3.5 bg-gradient-ozo text-white font-black rounded-xl shadow-ozo hover:scale-105 transition-all text-sm"
                  >
                    Save Card
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  )
}

export default Payments
