import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import * as Sentry from '@sentry/react'
import { 
  ChevronLeft, 
  Code, 
  Film, 
  Terminal, 
  Linkedin, 
  Instagram, 
  GraduationCap, 
  Sparkles, 
  Layers, 
  Server, 
  Cpu, 
  ArrowRight,
  ArrowLeft,
  Quote,
  Zap,
  TrendingUp,
  Workflow
} from 'lucide-react'

const Developer = () => {
  const navigate = useNavigate()
  const [activeTab, setActiveTab] = useState('all') // all, tech, creative, mission
  const [currentSlide, setCurrentSlide] = useState(0)

  // Social Media Slides Configuration
  const slides = [
    {
      title: "Who is building OZO?",
      subtitle: "The Mind Behind the Machine",
      badge: "Founder Profile",
      bgGradient: "from-red-600 to-indigo-900",
      content: (
        <div className="space-y-6 text-center md:text-left">
          <div className="inline-flex p-3 bg-white/10 rounded-2xl backdrop-blur-md text-yellow-400">
            <Sparkles size={32} />
          </div>
          <h3 className="text-3xl md:text-5xl font-black text-white leading-tight font-display">
            Meeting the Architect <br/>
            <span className="text-yellow-400">Behind OZO Mart.</span>
          </h3>
          <p className="text-gray-200 text-lg font-medium max-w-xl">
            A disruptive startup needs a unique synthesis of engineering depth and brand storytelling. Meet Aashutosh Kumar Mishra, spearheading India's next-gen 30-minute instant delivery loop for Tier-2/3 cities.
          </p>
        </div>
      )
    },
    {
      title: "The Tech Blueprint",
      subtitle: "Systems & Data Architecture",
      badge: "Software Engineering",
      bgGradient: "from-gray-900 via-indigo-950 to-blue-900",
      content: (
        <div className="space-y-6 text-center md:text-left">
          <div className="inline-flex p-3 bg-white/10 rounded-2xl backdrop-blur-md text-emerald-400">
            <Terminal size={32} />
          </div>
          <h3 className="text-3xl md:text-5xl font-black text-white leading-tight font-display">
            Optimized Code, <br/>
            <span className="text-emerald-400">Real-Time Speed.</span>
          </h3>
          <p className="text-gray-200 text-base md:text-lg font-medium max-w-xl">
            Enrolled in Data Science & Applications at <strong>IIT Madras</strong>, running a dedicated Linux Mint environment. Architecting production-grade Supabase backends with spatial routing matrixes, Edge proxies, and instant synchronization.
          </p>
          <div className="flex flex-wrap gap-2.5 justify-center md:justify-start">
            <span className="px-3 py-1 bg-white/10 rounded-full text-xs font-bold text-gray-200">Linux Mint</span>
            <span className="px-3 py-1 bg-white/10 rounded-full text-xs font-bold text-gray-200">IIT Madras</span>
            <span className="px-3 py-1 bg-white/10 rounded-full text-xs font-bold text-gray-200">Supabase</span>
            <span className="px-3 py-1 bg-white/10 rounded-full text-xs font-bold text-gray-200">React & Vite</span>
          </div>
        </div>
      )
    },
    {
      title: "The Creative Vision",
      subtitle: "Cinematic Branding & Psychology",
      badge: "Filmmaking",
      bgGradient: "from-purple-900 via-pink-950 to-red-950",
      content: (
        <div className="space-y-6 text-center md:text-left">
          <div className="inline-flex p-3 bg-white/10 rounded-2xl backdrop-blur-md text-pink-400">
            <Film size={32} />
          </div>
          <h3 className="text-3xl md:text-5xl font-black text-white leading-tight font-display">
            Aesthetic Meets <br/>
            <span className="text-pink-400">Engineering.</span>
          </h3>
          <p className="text-gray-200 text-lg font-medium max-w-xl">
            Beyond writing lines of code, Aashutosh is a filmmaker. This allows OZO Mart to be designed not just as an app, but as a premium, narrative-driven client experience that connects emotionally with local consumers.
          </p>
        </div>
      )
    },
    {
      title: "The Mission Ahead",
      subtitle: "30-Minute Hyper-Local Delivery",
      badge: "Startup Goal",
      bgGradient: "from-red-700 via-orange-600 to-yellow-800",
      content: (
        <div className="space-y-6 text-center md:text-left">
          <div className="inline-flex p-3 bg-white/10 rounded-2xl backdrop-blur-md text-white">
            <Zap size={32} className="animate-pulse" />
          </div>
          <h3 className="text-3xl md:text-5xl font-black text-white leading-tight font-display">
            Democratizing <br/>
            <span className="text-white">Regional Q-Commerce.</span>
          </h3>
          <p className="text-gray-200 text-lg font-medium max-w-xl">
            Redefining Tier-2 & Tier-3 retail infrastructure. By automating dark store integrations to customer doorsteps, we aren't just delivering goods; we are giving people their time back.
          </p>
          <blockquote className="border-l-4 border-white pl-4 italic text-sm text-gray-200">
            "We aren't just delivering groceries; we are engineering efficiency."
          </blockquote>
        </div>
      )
    }
  ]

  const nextSlide = () => {
    setCurrentSlide((prev) => (prev === slides.length - 1 ? 0 : prev + 1))
  }

  const prevSlide = () => {
    setCurrentSlide((prev) => (prev === 0 ? slides.length - 1 : prev - 1))
  }

  // Tech items list
  const techStack = [
    { name: 'React / Vite', category: 'frontend', icon: Code, desc: 'Ultra-fast client state interfaces built with responsive design.' },
    { name: 'Supabase Serverless', category: 'backend', icon: Server, desc: 'Edge proxies, real-time channels, and database triggers.' },
    { name: 'Linux Mint Environment', category: 'infrastructure', icon: Terminal, desc: 'Optimized local systems pipeline for compilation and deployment.' },
    { name: 'Spatial Routing Matrixes', category: 'algorithms', icon: Cpu, desc: 'Complex lat-long distance math for automated fulfillment.' },
    { name: 'Data Science (IIT Madras)', category: 'analytics', icon: GraduationCap, desc: 'Academic logic applied to consumer behavior and predictive analytics.' },
    { name: 'Storytelling & Art Direction', category: 'branding', icon: Film, desc: 'Cinematic color palettes, intuitive flows, and brand messaging.' }
  ]

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-[#0a0a0a] pb-24 transition-colors duration-300 relative overflow-hidden">
      
      {/* Back Button */}
      <div className="absolute top-6 left-6 z-20">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-white/80 dark:bg-[#1a1a1a]/85 backdrop-blur-md border border-gray-150/10 dark:border-white/10 text-gray-700 dark:text-gray-200 hover:text-ozo-red dark:hover:text-white font-black text-xs uppercase tracking-widest transition-all shadow-sm group hover:border-ozo-red/50 hover:bg-white dark:hover:bg-white/10"
        >
          <ChevronLeft size={16} className="group-hover:-translate-x-1 transition-transform" />
          Back
        </button>
      </div>

      {/* Decorative Blur Spheres */}
      <div className="absolute top-0 right-0 w-96 h-96 bg-red-500/10 dark:bg-ozo-red/5 blur-3xl rounded-full -mr-32 -mt-16 pointer-events-none" />
      <div className="absolute top-1/2 left-0 w-80 h-80 bg-green-500/10 dark:bg-ozo-green/5 blur-3xl rounded-full -ml-32 pointer-events-none" />

      {/* Hero Profile Banner */}
      <div className="bg-white dark:bg-[#0d0d0d] pt-28 pb-20 border-b border-gray-100 dark:border-white/5 relative">
        <div className="container-custom max-w-5xl mx-auto px-6">
          <div className="flex flex-col md:flex-row items-center gap-10">
            
            {/* Elite Stylized Profile Monogram Card */}
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.6 }}
              className="relative w-48 h-48 md:w-56 md:h-56 rounded-[3rem] p-1 bg-gradient-to-tr from-ozo-red via-purple-600 to-emerald-500 shadow-2xl flex-shrink-0 group cursor-pointer"
            >
              <div className="w-full h-full bg-[#0a0a0a] rounded-[2.85rem] overflow-hidden flex flex-col items-center justify-center relative">
                {/* Overlay Grid Pattern */}
                <div className="absolute inset-0 opacity-10 bg-[linear-gradient(to_right,#808080_1px,transparent_1px),linear-gradient(to_bottom,#808080_1px,transparent_1px)] bg-[size:14px_24px]" />
                
                {/* Visual Monogram */}
                <span className="text-6xl md:text-7xl font-black bg-clip-text text-transparent bg-gradient-to-br from-white via-gray-200 to-gray-600 select-none font-display">
                  AM
                </span>
                
                <span className="text-[10px] tracking-[0.25em] font-black uppercase text-yellow-400 mt-2 z-10">
                  SYSTEMS ENG.
                </span>

                {/* Animated Scanner Effect */}
                <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-ozo-red to-transparent opacity-60 w-full animate-pulse-subtle group-hover:translate-y-48 transition-transform duration-1000" />
              </div>
            </motion.div>

            {/* Title & Introduction */}
            <div className="flex-1 text-center md:text-left space-y-4">
              <motion.div 
                initial={{ y: 10, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                className="inline-flex items-center gap-2 px-3 py-1 bg-red-50 dark:bg-ozo-red/10 text-ozo-red dark:text-red-400 rounded-full text-xs font-black uppercase tracking-wider"
              >
                <Sparkles size={12} />
                FOUNDER & LEAD SYSTEMS ENGINEER
              </motion.div>

              <motion.h1 
                initial={{ y: 15, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.1 }}
                className="text-4xl md:text-6xl font-black text-gradient leading-tight font-display tracking-tight"
              >
                Aashutosh Kumar Mishra
              </motion.h1>

              <motion.p 
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.2 }}
                className="text-lg text-ozo-gray dark:text-gray-400 font-medium max-w-2xl leading-relaxed"
              >
                Enrolled in Data Science & Applications at <strong>IIT Madras</strong>. Bringing analytical rigor, optimized systems code, and visual filmmaking narrative to lead the technology architecture of OZO Mart.
              </motion.p>

              {/* Social Connects */}
              <motion.div 
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.3 }}
                className="flex items-center justify-center md:justify-start gap-4 pt-3"
              >
                <a 
                  href="https://linkedin.com" 
                  target="_blank" 
                  rel="noreferrer"
                  className="flex items-center gap-2 px-4 py-2 bg-blue-50 dark:bg-blue-950/20 text-[#0a66c2] hover:bg-[#0a66c2] hover:text-white rounded-xl text-sm font-bold transition-all border border-blue-100 dark:border-blue-900/10 shadow-sm"
                >
                  <Linkedin size={16} />
                  <span>LinkedIn</span>
                </a>
                <a 
                  href="https://www.instagram.com/ozomart.store" 
                  target="_blank" 
                  rel="noreferrer"
                  className="flex items-center gap-2 px-4 py-2 bg-pink-50 dark:bg-pink-950/20 text-[#e4405f] hover:bg-gradient-to-r hover:from-pink-500 hover:to-orange-500 hover:text-white rounded-xl text-sm font-bold transition-all border border-pink-100 dark:border-pink-900/10 shadow-sm"
                >
                  <Instagram size={16} />
                  <span>Instagram</span>
                </a>
              </motion.div>
            </div>

          </div>
        </div>
      </div>

      {/* Main Content Sections */}
      <div className="container-custom max-w-5xl mx-auto px-6 mt-16">
        
        {/* Core Profile Narrative Card */}
        {/* Core Profile Narrative Card */}
        <div className="bg-white dark:bg-[#111111] p-8 md:p-10 rounded-[2.5rem] border border-gray-150/10 dark:border-white/5 shadow-xl space-y-6 mb-16">
          <h2 className="text-2xl font-black text-gray-900 dark:text-white font-display flex items-center gap-2">
            <Quote className="text-ozo-red" size={24} />
             Meeting the Architect
          </h2>
          <div className="text-gray-700 dark:text-gray-300 font-medium space-y-4 leading-relaxed">
            <p>
              Every disruptive startup begins with a vision to bridge a massive gap. For <strong>OZO Mart</strong>, that vision is driven by <strong>Aashutosh Kumar Mishra</strong>, our Founder, CEO, and Lead Systems Engineer.
            </p>
            <p>
              Aashutosh is a rare combination of a <strong>highly technical Software Developer</strong> and a <strong>visionary Filmmaker</strong>. Enrolled in the prestigious Data Science & Applications program at <strong>IIT Madras</strong>, he brings a deep, analytical approach to solving complex logistics, combined with a sharp eye for elite visual branding and consumer psychological behavior.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 pt-6 border-t border-gray-100 dark:border-white/5">
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-ozo-red font-black text-sm uppercase tracking-wider">
                <Code size={16} />
                <span>The Developer</span>
              </div>
              <p className="text-sm text-ozo-gray dark:text-gray-400 font-medium">
                Optimizing systems code on Linux Mint, orchestrating database transactions, APIs, and real-time edge triggers.
              </p>
            </div>
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-ozo-green font-black text-sm uppercase tracking-wider">
                <Film size={16} />
                <span>The Filmmaker</span>
              </div>
              <p className="text-sm text-ozo-gray dark:text-gray-400 font-medium">
                Infusing aesthetic branding, cinematography, and human behavior to engineer premium user interfaces.
              </p>
            </div>
          </div>
        </div>

        {/* Dual Pillars Section: Tech & Creative */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-16">
          
          {/* Column Tech */}
          <div className="bg-white dark:bg-[#111111] p-8 rounded-[2.5rem] border border-gray-150/10 dark:border-white/5 shadow-xl space-y-6">
            <div className="w-12 h-12 bg-red-50 dark:bg-ozo-red/10 rounded-2xl flex items-center justify-center text-ozo-red">
              <Cpu size={24} />
            </div>
            <h3 className="text-2xl font-black text-gray-900 dark:text-white font-display">
              The Technical Powerhouse
            </h3>
            <p className="text-ozo-gray dark:text-gray-400 font-medium leading-relaxed">
              Aashutosh doesn’t just manage the business strategy; he builds the core technology brick by brick. Running a dedicated, optimized Linux Mint environment, he spearheads the end-to-end architecture of OZO Mart. From deploying modern, ultra-responsive frontend frameworks to architecting production-grade backend structures on Supabase for real-time synchronization, cloud edge proxies, and complex spatial/distance calculation matrixes—his code powers the entire hyper-fast fulfillment loop.
            </p>
            <div className="flex items-center gap-3 text-sm font-bold text-ozo-red">
              <Workflow size={16} />
              <span>Spatial SQL & Real-Time Sync</span>
            </div>
          </div>

          {/* Column Creative */}
          <div className="bg-white dark:bg-[#111111] p-8 rounded-[2.5rem] border border-gray-150/10 dark:border-white/5 shadow-xl space-y-6">
            <div className="w-12 h-12 bg-green-50 dark:bg-ozo-green/10 rounded-2xl flex items-center justify-center text-ozo-green">
              <Film size={24} />
            </div>
            <h3 className="text-2xl font-black text-gray-900 dark:text-white font-display">
              The Creative Visionary
            </h3>
            <p className="text-ozo-gray dark:text-gray-400 font-medium leading-relaxed">
              Beyond lines of code, Aashutosh is a filmmaker who understands the art of storytelling and cinematic branding. This unique duality allows him to design OZO Mart not just as a functional application, but as a premium, intuitive customer experience. His expertise ensures that the user interface, brand narrative, and market placement resonate instantly with the local audience.
            </p>
            <div className="flex items-center gap-3 text-sm font-bold text-ozo-green">
              <TrendingUp size={16} />
              <span>Cinematic UI Branding Strategy</span>
            </div>
          </div>

        </div>

        {/* Dynamic Presentation Carousel Component (Instagram/LinkedIn Slides Suggestions) */}
        <div className="bg-white dark:bg-[#111111] rounded-[2.5rem] border border-gray-150/10 dark:border-white/5 p-8 md:p-12 shadow-xl mb-16 relative overflow-hidden">
          <div className="absolute top-0 right-0 p-4 opacity-5 text-gray-500 font-black text-7xl select-none font-display">
            DECK
          </div>
          <div className="mb-6 flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-gray-150/10 dark:border-white/5 pb-6">
            <div>
              <span className="text-[10px] font-black uppercase tracking-widest text-ozo-red bg-red-50 dark:bg-ozo-red/10 px-3 py-1 rounded-full">
                Interactive Concept
              </span>
              <h3 className="text-2xl font-black text-gray-900 dark:text-white font-display mt-2">
                Social Media Carousel Post Draft
              </h3>
            </div>
            <div className="flex items-center gap-2">
              <button 
                onClick={prevSlide}
                className="w-10 h-10 rounded-xl bg-gray-50 dark:bg-white/5 border border-gray-150/10 dark:border-white/10 flex items-center justify-center hover:bg-gray-100 dark:hover:bg-white/10 transition-colors text-gray-700 dark:text-gray-300"
              >
                <ArrowLeft size={16} />
              </button>
              <span className="text-sm font-bold text-ozo-gray min-w-[40px] text-center">
                {currentSlide + 1} / {slides.length}
              </span>
              <button 
                onClick={nextSlide}
                className="w-10 h-10 rounded-xl bg-gray-50 dark:bg-white/5 border border-gray-150/10 dark:border-white/10 flex items-center justify-center hover:bg-gray-100 dark:hover:bg-white/10 transition-colors text-gray-700 dark:text-gray-300"
              >
                <ArrowRight size={16} />
              </button>
            </div>
          </div>

          {/* Slider Frame */}
          <div className="relative overflow-hidden min-h-[300px] rounded-3xl bg-gradient-to-br from-gray-950 via-gray-900 to-indigo-950 text-white p-8 md:p-12 flex flex-col justify-between shadow-inner">
            
            {/* Glowing Accent */}
            <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full blur-2xl" />

            <div className="flex items-center justify-between text-xs text-gray-400 font-bold uppercase tracking-wider mb-6">
              <span>{slides[currentSlide].badge}</span>
              <span className="text-yellow-400">Slide {currentSlide + 1}</span>
            </div>

            <AnimatePresence mode="wait">
              <motion.div
                key={currentSlide}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.3 }}
                className="flex-1 flex items-center"
              >
                {slides[currentSlide].content}
              </motion.div>
            </AnimatePresence>

            <div className="flex items-center justify-between mt-8 text-xs text-gray-500 font-medium">
              <span>OZO Mart CEO Profile Deck</span>
              <span>Slide Suggestion Suggestions</span>
            </div>

          </div>

          {/* Dots Indicator */}
          <div className="flex justify-center gap-2 mt-6">
            {slides.map((_, index) => (
              <button
                key={index}
                onClick={() => setCurrentSlide(index)}
                className={`w-2 h-2 rounded-full transition-all duration-300 ${
                  index === currentSlide ? 'w-6 bg-ozo-red' : 'bg-gray-300 dark:bg-white/10'
                }`}
              />
            ))}
          </div>
        </div>

        {/* Detailed Skills Tag Grid */}
        <div className="bg-white dark:bg-[#111111] p-8 md:p-10 rounded-[2.5rem] border border-gray-150/10 dark:border-white/5 shadow-xl space-y-6 mb-16">
          <div className="text-center md:text-left">
            <h3 className="text-2xl font-black text-gray-900 dark:text-white font-display">
              Technical Skillset & Architecture Stack
            </h3>
            <p className="text-sm text-ozo-gray dark:text-gray-400 mt-1">
              Building optimized algorithms and robust delivery microservices.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 pt-4">
            {techStack.map((tech, i) => (
              <div 
                key={i} 
                className="p-5 rounded-2xl bg-gray-50 dark:bg-white/5 border border-gray-100 dark:border-white/5 hover:border-ozo-red/20 transition-all group"
              >
                <div className="w-10 h-10 rounded-xl bg-red-50 dark:bg-ozo-red/10 text-ozo-red flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                  <tech.icon size={20} />
                </div>
                <h4 className="font-bold text-gray-900 dark:text-white">{tech.name}</h4>
                <p className="text-xs text-ozo-gray dark:text-gray-400 mt-2 font-medium leading-relaxed">
                  {tech.desc}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* Sentry Integration Verification Section */}
        <div className="bg-white dark:bg-[#111111] p-8 md:p-10 rounded-[2.5rem] border border-gray-150/10 dark:border-white/5 shadow-xl space-y-6 mb-16 relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-64 h-64 bg-purple-500/10 dark:bg-purple-500/5 blur-3xl rounded-full -mr-20 -mt-20 pointer-events-none" />
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
            <div className="space-y-2">
              <span className="text-[10px] font-black uppercase tracking-widest text-purple-500 bg-purple-50/50 dark:bg-purple-950/20 px-3 py-1 rounded-full border border-purple-150/20">
                System Health & Telemetry
              </span>
              <h3 className="text-2xl font-black text-gray-900 dark:text-white font-display">
                Sentry Error Monitoring
              </h3>
              <p className="text-sm text-ozo-gray dark:text-gray-400 font-medium max-w-xl">
                Real-time error tracking, transaction logs, and session replays are configured. Click the button to dispatch a test event and confirm integration.
              </p>
            </div>
            <button
              onClick={() => {
                Sentry.logger.info('User triggered test error', {
                  action: 'test_error_button_click',
                });
                Sentry.metrics.count('test_counter', 1);
                throw new Error('This is your first error!');
              }}
              className="flex-shrink-0 px-6 py-4 rounded-2xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-black text-xs uppercase tracking-widest transition-all shadow-lg shadow-purple-500/20 hover:shadow-purple-500/30 transform hover:-translate-y-0.5 active:translate-y-0"
            >
              Break the world
            </button>
          </div>
        </div>

        {/* Mission Footer Banner */}
        <div className="bg-gradient-to-tr from-gray-950 to-indigo-950 text-white rounded-[2.5rem] p-8 md:p-12 text-center relative overflow-hidden shadow-2xl">
          <div className="absolute inset-0 opacity-5 bg-[linear-gradient(to_right,#808080_1px,transparent_1px),linear-gradient(to_bottom,#808080_1px,transparent_1px)] bg-[size:24px_24px]" />
          
          <div className="max-w-2xl mx-auto space-y-6 relative z-10">
            <h3 className="text-3xl font-black font-display text-white">
              The Mission Ahead
            </h3>
            <p className="text-gray-300 text-base md:text-lg font-medium leading-relaxed">
              With OZO Mart, Aashutosh is focused on democratizing high-end technology for regional markets. By creating a zero-friction, automated supply-chain infrastructure that bridges local dark stores to consumer doorsteps in under 30 minutes, he is redefining how everyday essentials are consumed.
            </p>
            
            <div className="pt-4 flex flex-col items-center gap-3">
              <span className="text-gradient font-black text-xl italic">
                "We aren't just delivering groceries; we are engineering efficiency and giving people their time back."
              </span>
              <span className="text-xs font-black tracking-widest text-gray-400 uppercase mt-1">
                — AASHUTOSH KUMAR MISHRA
              </span>
            </div>
          </div>
        </div>

      </div>
    </div>
  )
}

export default Developer
