import { 
  XCircle, 
  Clock, 
  MapPin, 
  Tag, 
  HelpCircle, 
  AlertTriangle,
  FileText,
  AlertOctagon,
  RefreshCw,
  MinusCircle,
  PackageX,
  CreditCard
} from 'lucide-react'

const CANCEL_REASONS = [
  { id: 'mistake', text: 'Placed order by mistake / Changed my mind', icon: XCircle },
  { id: 'delay', text: 'Expected delivery time is too long', icon: Clock },
  { id: 'address', text: 'Incorrect delivery address selected', icon: MapPin },
  { id: 'coupon', text: 'Forgot to apply discount or coupon code', icon: Tag },
  { id: 'other', text: 'Other (Please specify details)', icon: HelpCircle },
]

const RETURN_REASONS = [
  { id: 'wrong_item', text: 'Received incorrect item(s) / wrong brand', icon: PackageX },
  { id: 'damaged', text: 'Items are damaged, broken or leakage found', icon: AlertTriangle },
  { id: 'expired', text: 'Received expired or near-expiry item', icon: AlertOctagon },
  { id: 'quality', text: 'Quality not up to standard or expectations', icon: RefreshCw },
  { id: 'other', text: 'Other (Please specify details)', icon: HelpCircle },
]

const REFUND_REASONS = [
  { id: 'missing_item', text: 'Items missing from my delivered package', icon: MinusCircle },
  { id: 'double_charge', text: 'Double charged / Transaction failed but money deducted', icon: CreditCard },
  { id: 'incorrect_price', text: 'Incorrect price or weight calculations', icon: Tag },
  { id: 'other', text: 'Other (Please specify details)', icon: HelpCircle },
]

const ReasonSelector = ({ 
  type = 'cancel', 
  selectedReason, 
  onChange, 
  customNote = '', 
  onCustomNoteChange,
  maxLength = 500
}) => {
  const getReasons = () => {
    switch (type) {
      case 'return':
        return RETURN_REASONS
      case 'refund':
        return REFUND_REASONS
      case 'cancel':
      default:
        return CANCEL_REASONS
    }
  }

  const reasons = getReasons()

  return (
    <div className="space-y-6">
      <div>
        <label className="block text-xs font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-3">
          Select Reason
        </label>
        <div className="grid grid-cols-1 gap-3">
          {reasons.map((reason) => {
            const isSelected = selectedReason === reason.text
            const Icon = reason.icon

            return (
              <button
                key={reason.id}
                type="button"
                onClick={() => onChange(reason.text)}
                className={`w-full p-4 rounded-2xl flex items-center gap-4 text-left transition-all border font-semibold text-sm ${
                  isSelected
                    ? 'bg-ozo-red/5 border-ozo-red text-ozo-red shadow-sm'
                    : 'bg-gray-50 dark:bg-white/[0.02] border-gray-100 dark:border-white/5 text-gray-700 dark:text-gray-300 hover:border-gray-200 dark:hover:border-white/10'
                }`}
              >
                <div className={`p-2 rounded-xl flex-shrink-0 transition-colors ${
                  isSelected 
                    ? 'bg-ozo-red text-white' 
                    : 'bg-white dark:bg-white/5 text-gray-400'
                }`}>
                  <Icon size={16} />
                </div>
                <span className="flex-1">{reason.text}</span>
              </button>
            )
          })}
        </div>
      </div>

      {/* Custom details / note text box */}
      <div className="space-y-2">
        <label className="block text-xs font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest flex items-center gap-1.5">
          <FileText size={12} />
          Additional Details (Optional)
        </label>
        <textarea
          value={customNote}
          onChange={(e) => onCustomNoteChange(e.target.value)}
          maxLength={maxLength}
          placeholder="Please share any additional information here..."
          className="w-full px-4 py-3 bg-gray-50 dark:bg-white/[0.02] border border-gray-100 dark:border-white/10 rounded-2xl focus:outline-none focus:ring-2 focus:ring-ozo-red/20 font-semibold text-sm placeholder-gray-400 dark:placeholder-gray-600 resize-none min-h-[90px]"
        />
      </div>
    </div>
  )
}

export default ReasonSelector
