import { useState, useEffect, FormEvent, createContext, useContext, ReactNode, Component, ErrorInfo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Phone, 
  MapPin, 
  Clock, 
  ChevronRight, 
  CheckCircle2, 
  MessageSquare, 
  Menu, 
  X,
  Factory,
  Package,
  ShieldCheck,
  Truck,
  ArrowRight,
  AlertTriangle
} from 'lucide-react';
import { 
  collection, 
  addDoc, 
  serverTimestamp, 
  getDocFromServer, 
  doc 
} from 'firebase/firestore';
import { signInAnonymously, onAuthStateChanged, User } from 'firebase/auth';
import { db, auth } from './firebase';

// --- Types & Error Handling ---

enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId: string | undefined;
    email: string | null | undefined;
    emailVerified: boolean | undefined;
    isAnonymous: boolean | undefined;
    tenantId: string | null | undefined;
    providerInfo: {
      providerId: string;
      displayName: string | null;
      email: string | null;
      photoUrl: string | null;
    }[];
  }
}

function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData.map(provider => ({
        providerId: provider.providerId,
        displayName: provider.displayName,
        email: provider.email,
        photoUrl: provider.photoURL
      })) || []
    },
    operationType,
    path
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

// --- Error Boundary ---

class ErrorBoundary extends Component<{ children: ReactNode }, { hasError: boolean, errorInfo: string | null }> {
  constructor(props: { children: ReactNode }) {
    super(props);
    this.state = { hasError: false, errorInfo: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, errorInfo: error.message };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Uncaught error:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      let displayMessage = "Something went wrong. Please try again later.";
      try {
        const parsed = JSON.parse(this.state.errorInfo || "");
        if (parsed.error) displayMessage = `Database Error: ${parsed.error}`;
      } catch {
        // Not a JSON error
      }

      return (
        <div className="min-h-screen bg-steel flex items-center justify-center p-6">
          <div className="bg-steel-mid border border-rust p-8 max-w-md text-center">
            <AlertTriangle className="text-rust mx-auto mb-4" size={48} />
            <h2 className="font-teko text-3xl text-white mb-4 uppercase tracking-wider">System Error</h2>
            <p className="text-silver mb-6">{displayMessage}</p>
            <button 
              onClick={() => window.location.reload()}
              className="bg-rust text-white px-8 py-3 font-bold uppercase tracking-widest"
            >
              Reload Page
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

// --- Firebase Context ---

const FirebaseContext = createContext<{ user: User | null; isAuthReady: boolean }>({ user: null, isAuthReady: false });

const FirebaseProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isAuthReady, setIsAuthReady] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setIsAuthReady(true);
    });

    // Sign in anonymously if not logged in to satisfy security rules
    if (!auth.currentUser) {
      signInAnonymously(auth).catch(err => console.error("Auth error:", err));
    }

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    async function testConnection() {
      try {
        await getDocFromServer(doc(db, 'test', 'connection'));
      } catch (error) {
        if(error instanceof Error && error.message.includes('the client is offline')) {
          console.error("Please check your Firebase configuration. ");
        }
      }
    }
    testConnection();
  }, []);

  return (
    <FirebaseContext.Provider value={{ user, isAuthReady }}>
      {children}
    </FirebaseContext.Provider>
  );
};

const useFirebase = () => useContext(FirebaseContext);

// --- Components ---

const Navbar = () => {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 50);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const navLinks = [
    { name: 'Brands', href: '#brands' },
    { name: 'Products', href: '#products' },
    { name: 'Why Us', href: '#why' },
    { name: 'Contact', href: '#contact' },
  ];

  return (
    <nav className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
      isScrolled ? 'h-16 bg-steel/95 backdrop-blur-md border-b border-rust' : 'h-20 bg-transparent'
    }`}>
      <div className="max-w-7xl mx-auto px-6 h-full flex items-center justify-between">
        <div className="font-teko text-3xl font-bold tracking-wider text-white">
          KUBER <span className="text-gold">ENTERPRISES</span>
        </div>

        {/* Desktop Nav */}
        <div className="hidden md:flex items-center gap-8">
          {navLinks.map((link) => (
            <a 
              key={link.name} 
              href={link.href} 
              className="text-sm font-semibold uppercase tracking-widest text-silver hover:text-gold transition-colors"
            >
              {link.name}
            </a>
          ))}
          <a 
            href="#contact" 
            className="bg-rust hover:bg-accent text-white px-6 py-2 rounded-sm text-sm font-bold uppercase tracking-widest transition-all transform hover:-translate-y-0.5"
          >
            Get Quote
          </a>
        </div>

        {/* Mobile Toggle */}
        <button 
          className="md:hidden text-white"
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
        >
          {isMobileMenuOpen ? <X size={28} /> : <Menu size={28} />}
        </button>
      </div>

      {/* Mobile Menu */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <motion.div 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="absolute top-full left-0 right-0 bg-steel-mid border-b border-rust p-6 flex flex-col gap-4 md:hidden"
          >
            {navLinks.map((link) => (
              <a 
                key={link.name} 
                href={link.href} 
                onClick={() => setIsMobileMenuOpen(false)}
                className="text-lg font-semibold uppercase tracking-widest text-silver"
              >
                {link.name}
              </a>
            ))}
            <a 
              href="#contact" 
              onClick={() => setIsMobileMenuOpen(false)}
              className="bg-rust text-white px-6 py-3 rounded-sm text-center font-bold uppercase tracking-widest"
            >
              Get Quote
            </a>
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  );
};

const Hero = () => {
  return (
    <section id="hero" className="relative min-h-screen flex items-center pt-20 overflow-hidden">
      {/* Background Elements */}
      <div className="absolute inset-0 z-0">
        <div className="absolute inset-0 bg-gradient-to-br from-rust/10 via-transparent to-transparent" />
        <div className="absolute inset-0 bg-[repeating-linear-gradient(-45deg,transparent,transparent_28px,rgba(255,255,255,0.01)_28px,rgba(255,255,255,0.01)_30px)]" />
        <div className="absolute inset-0 bg-gradient-to-b from-[#0d1520] via-steel to-steel-mid" />
      </div>

      <div className="max-w-7xl mx-auto px-6 relative z-10 grid lg:grid-cols-12 gap-12 items-center">
        <div className="lg:col-span-8">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="inline-block border border-gold/40 px-4 py-1 mb-6"
          >
            <span className="text-[10px] font-bold uppercase tracking-[0.3em] text-gold">
              Kakching, Manipur · Est. Dealers
            </span>
          </motion.div>

          <motion.h1 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="font-teko text-6xl md:text-8xl lg:text-9xl font-bold leading-[0.9] text-white tracking-tight"
          >
            STRENGTH IN <br />
            <span className="text-rust">STEEL.</span> <br />
            TRUST IN <br />
            <span className="text-rust">QUALITY.</span>
          </motion.h1>

          <motion.p 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="mt-8 text-lg md:text-xl text-silver font-light max-w-xl leading-relaxed"
          >
            Your premier dealer for <strong className="text-gold font-medium">Nezone & Kamdhenu</strong> branded iron & steel products — square pipes, roofing sheets, and more.
          </motion.p>

          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
            className="mt-10 flex flex-wrap gap-4"
          >
            <a href="#contact" className="bg-rust hover:bg-accent text-white px-8 py-4 font-bold uppercase tracking-widest transition-all transform hover:-translate-y-1">
              Get Free Quote
            </a>
            <a href="#products" className="border-2 border-white/20 hover:border-gold hover:text-gold text-white px-8 py-4 font-bold uppercase tracking-widest transition-all">
              View Products
            </a>
          </motion.div>
        </div>

        <div className="lg:col-span-4 hidden lg:flex flex-col gap-6">
          {[
            { num: '2+', label: 'Premium Brands' },
            { num: '50+', label: 'Product Variants' },
            { num: '100%', label: 'Genuine Stock' }
          ].map((stat, i) => (
            <motion.div 
              key={i}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6, delay: 0.4 + i * 0.1 }}
              className="bg-white/5 border border-white/10 border-l-4 border-l-rust p-6 backdrop-blur-sm"
            >
              <div className="font-teko text-5xl font-bold text-gold leading-none">{stat.num}</div>
              <div className="text-[10px] font-bold uppercase tracking-widest text-silver mt-1">{stat.label}</div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

const Ticker = () => {
  const items = [
    "Square Pipes", "Rectangular Pipes", "Nezone Brand", "Kamdhenu Brand", 
    "Roofing Sheets", "Iron Channels", "Angles & Flats", "MS Bars"
  ];
  
  return (
    <div className="bg-rust py-3 overflow-hidden whitespace-nowrap border-y border-white/10">
      <motion.div 
        animate={{ x: [0, -1000] }}
        transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
        className="inline-block"
      >
        {[...Array(4)].map((_, i) => (
          <span key={i} className="inline-flex items-center">
            {items.map((item, j) => (
              <span key={j} className="flex items-center">
                <span className="text-xs font-bold uppercase tracking-widest text-white/90 mx-8">{item}</span>
                <span className="text-gold">◆</span>
              </span>
            ))}
          </span>
        ))}
      </motion.div>
    </div>
  );
};

const Brands = () => {
  const brands = [
    {
      name: "NEZONE",
      tag: "Primary",
      desc: "Northeast India's largest steel manufacturer. Trusted for consistent quality and dimensional accuracy across the region."
    },
    {
      name: "KAMDHENU",
      tag: "Primary",
      desc: "One of India's most recognised steel brands. Superior tensile strength and compliance with BIS standards."
    },
    {
      name: "ADDITIONAL ITEMS",
      tag: "Misc",
      desc: "Curated range of iron and steel accessories including channels, angles, flats, and MS bars to fulfill all construction needs."
    }
  ];

  return (
    <section id="brands" className="bg-steel-mid py-24">
      <div className="max-w-7xl mx-auto px-6">
        <div className="mb-12">
          <span className="text-xs font-bold uppercase tracking-[0.3em] text-rust block mb-2">Authorized Dealer</span>
          <h2 className="font-teko text-5xl md:text-6xl font-bold text-white leading-none">
            Trusted <span className="text-gold">Brands</span>
          </h2>
          <p className="mt-4 text-silver font-light max-w-xl">
            We stock products exclusively from India's leading certified steel manufacturers — ensuring quality you can build on.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-px bg-white/5 border border-white/5">
          {brands.map((brand, i) => (
            <motion.div 
              key={i}
              whileHover={{ backgroundColor: 'rgba(255,255,255,0.05)', y: -4 }}
              className="bg-steel-mid p-10 relative group transition-all"
            >
              <div className="absolute top-0 left-0 w-1 h-0 bg-gold group-hover:h-full transition-all duration-300" />
              <div className="flex items-center gap-3 mb-4">
                <h3 className="font-teko text-3xl font-bold text-white tracking-wider">{brand.name}</h3>
                <span className="text-[10px] font-bold bg-gold/10 text-gold px-2 py-0.5 uppercase tracking-widest">{brand.tag}</span>
              </div>
              <p className="text-silver text-sm font-light leading-relaxed">{brand.desc}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

const Products = () => {
  const products = [
    {
      name: "Square Pipes",
      cat: "Structural Pipes",
      desc: "Equal-section hollow structural steel sections. Ideal for frames, gates, and light structures.",
      specs: ["Nezone", "Kamdhenu", "MS Grade"],
      icon: <Package className="text-rust" size={40} />
    },
    {
      name: "Rectangular Pipes",
      cat: "Structural Pipes",
      desc: "Hollow rectangular section tubes for spanning longer distances with great load capacity.",
      specs: ["Nezone", "Kamdhenu", "Multiple Gauges"],
      icon: <ArrowRight className="text-rust" size={40} />
    },
    {
      name: "Roofing Sheets",
      cat: "Roofing",
      desc: "Galvanized and colour-coated corrugated & profile roofing sheets. Weather-proof and long-lasting.",
      specs: ["GI Sheets", "Colour Coated", "Profile"],
      icon: <ShieldCheck className="text-rust" size={40} />
    },
    {
      name: "MS Bars & Rods",
      cat: "Iron Items",
      desc: "Mild steel bars and rods for reinforcement, fabrication, and general ironwork purposes.",
      specs: ["Flat Bars", "Round Bars"],
      icon: <Factory className="text-rust" size={40} />
    },
    {
      name: "Angles & Channels",
      cat: "Iron Items",
      desc: "Structural angles (L-sections) and channels (C-sections) for frameworks and supports.",
      specs: ["Equal Angles", "C-Channel", "Various Sizes"],
      icon: <ChevronRight className="text-rust" size={40} />
    },
    {
      name: "Flats & Misc Iron",
      cat: "Iron Items",
      desc: "MS flat bars, plates, and miscellaneous iron items for all construction and welding needs.",
      specs: ["MS Flats", "Plates", "Fasteners"],
      icon: <Package className="text-rust" size={40} />
    }
  ];

  return (
    <section id="products" className="py-24 bg-steel">
      <div className="max-w-7xl mx-auto px-6">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-8 mb-16">
          <div>
            <span className="text-xs font-bold uppercase tracking-[0.3em] text-rust block mb-2">Our Range</span>
            <h2 className="font-teko text-5xl md:text-6xl font-bold text-white leading-none">
              What We <span className="text-gold">Supply</span>
            </h2>
          </div>
          <a href="#contact" className="bg-rust hover:bg-accent text-white px-8 py-4 font-bold uppercase tracking-widest transition-all">
            Request Quote →
          </a>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {products.map((product, i) => (
            <motion.div 
              key={i}
              whileHover={{ y: -8 }}
              className="bg-steel-mid border border-white/5 p-8 flex flex-col h-full group"
            >
              <div className="mb-6 bg-white/5 w-16 h-16 flex items-center justify-center rounded-sm">
                {product.icon}
              </div>
              <div className="text-[10px] font-bold uppercase tracking-widest text-rust mb-2">{product.cat}</div>
              <h3 className="font-teko text-2xl font-bold text-white mb-3 tracking-wide">{product.name}</h3>
              <p className="text-silver text-sm font-light leading-relaxed mb-6 flex-grow">{product.desc}</p>
              <div className="flex flex-wrap gap-2">
                {product.specs.map((spec, j) => (
                  <span key={j} className="text-[10px] font-medium bg-white/5 text-silver/80 px-2 py-1 rounded-sm border border-white/5">
                    {spec}
                  </span>
                ))}
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

const WhyUs = () => {
  const reasons = [
    {
      title: "Authorized Dealership",
      desc: "Certified dealer for Nezone and Kamdhenu — only 100% genuine, branded products.",
      icon: <ShieldCheck className="text-rust" />
    },
    {
      title: "Wide Inventory",
      desc: "Square pipes, roofing, bars, angles, channels — all under one roof.",
      icon: <Package className="text-rust" />
    },
    {
      title: "Competitive Pricing",
      desc: "Best market rates for contractors, builders, and retailers. Bulk discount available.",
      icon: <ArrowRight className="text-rust" />
    },
    {
      title: "Fast Local Delivery",
      desc: "Prompt delivery across Kakching district and nearby areas in Manipur.",
      icon: <Truck className="text-rust" />
    }
  ];

  return (
    <section id="why" className="bg-steel-mid py-24">
      <div className="max-w-7xl mx-auto px-6 grid lg:grid-cols-2 gap-16 items-center">
        <div>
          <span className="text-xs font-bold uppercase tracking-[0.3em] text-rust block mb-2">Why Choose Us</span>
          <h2 className="font-teko text-5xl md:text-6xl font-bold text-white leading-none mb-6">
            Built on <span className="text-gold">Integrity</span>
          </h2>
          <p className="text-silver font-light leading-relaxed mb-10">
            We are committed to supplying genuine, high-grade steel products with transparent pricing and prompt delivery to your project site across Kakching and Manipur.
          </p>

          <div className="space-y-6">
            {reasons.map((reason, i) => (
              <div key={i} className="flex gap-6 p-6 bg-white/5 border border-white/5 border-l-2 border-l-rust hover:bg-white/[0.07] transition-all">
                <div className="bg-rust/10 p-3 h-fit rounded-sm">
                  {reason.icon}
                </div>
                <div>
                  <h4 className="font-teko text-xl font-bold text-white tracking-wide">{reason.title}</h4>
                  <p className="text-silver text-sm font-light mt-1">{reason.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-gradient-to-br from-[#0d1520] to-steel p-10 border border-white/10 shadow-2xl">
          <h3 className="font-teko text-3xl font-bold text-gold mb-8 tracking-wide">📍 Visit Our Store</h3>
          
          <div className="space-y-8">
            <div className="flex gap-4">
              <MapPin className="text-rust shrink-0" size={20} />
              <div>
                <strong className="text-white font-medium block mb-1">Address</strong>
                <p className="text-silver text-sm font-light">
                  F2V2+43F, Burma - Sugnu Road,<br />
                  Irum Lamdong, Kakching,<br />
                  Manipur – 795103
                </p>
              </div>
            </div>

            <div className="flex gap-4">
              <Phone className="text-rust shrink-0" size={20} />
              <div>
                <strong className="text-white font-medium block mb-1">Phone</strong>
                <p className="text-silver text-sm font-light">
                  <a href="tel:7628024273" className="hover:text-gold transition-colors">+91 76280 24273</a><br />
                  <a href="tel:9863389703" className="hover:text-gold transition-colors">+91 98633 89703</a>
                </p>
              </div>
            </div>

            <div className="flex gap-4">
              <Clock className="text-rust shrink-0" size={20} />
              <div>
                <strong className="text-white font-medium block mb-1">Business Hours</strong>
                <p className="text-silver text-sm font-light">
                  Open Daily: 7:00 AM – 6:00 PM<br />
                  (Including Sundays)
                </p>
              </div>
            </div>
          </div>

          <div className="mt-10 flex flex-wrap gap-4">
            <a href="tel:7628024273" className="bg-rust hover:bg-accent text-white px-6 py-3 font-bold uppercase tracking-widest text-xs transition-all">
              📞 Call Us
            </a>
            <a href="https://wa.me/917628024273" target="_blank" className="border border-white/20 hover:border-gold hover:text-gold text-white px-6 py-3 font-bold uppercase tracking-widest text-xs transition-all">
              WhatsApp
            </a>
          </div>
        </div>
      </div>
    </section>
  );
};


const Contact = () => {
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    product: '',
    message: ''
  });
  const [status, setStatus] = useState<'idle' | 'submitting' | 'success'>('idle');

  const { isAuthReady } = useFirebase();

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!isAuthReady) return;
    setStatus('submitting');
    
    const path = 'inquiries';
    try {
      // Save to Firestore
      await addDoc(collection(db, path), {
        ...formData,
        createdAt: serverTimestamp()
      });

      // Also notify backend
      await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });

      setStatus('success');
      setFormData({ name: '', phone: '', product: '', message: '' });
      setTimeout(() => setStatus('idle'), 5000);
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, path);
      setStatus('idle');
    }
  };

  return (
    <section id="contact" className="py-24 bg-steel">
      <div className="max-w-7xl mx-auto px-6">
        <div className="mb-16">
          <span className="text-xs font-bold uppercase tracking-[0.3em] text-rust block mb-2">Get In Touch</span>
          <h2 className="font-teko text-5xl md:text-6xl font-bold text-white leading-none">
            Request a <span className="text-gold">Quote</span>
          </h2>
          <p className="mt-4 text-silver font-light max-w-xl">
            Tell us what you need and we'll get back to you with pricing and availability.
          </p>
        </div>

        <div className="grid lg:grid-cols-2 gap-16">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-[10px] font-bold uppercase tracking-widest text-silver">Your Name</label>
                <input 
                  type="text" 
                  required
                  value={formData.name}
                  onChange={e => setFormData({...formData, name: e.target.value})}
                  className="w-full bg-white/5 border border-white/10 p-4 text-white outline-none focus:border-gold transition-all"
                  placeholder="Full Name"
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-bold uppercase tracking-widest text-silver">Phone Number</label>
                <input 
                  type="tel" 
                  required
                  value={formData.phone}
                  onChange={e => setFormData({...formData, phone: e.target.value})}
                  className="w-full bg-white/5 border border-white/10 p-4 text-white outline-none focus:border-gold transition-all"
                  placeholder="+91 XXXXX XXXXX"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-bold uppercase tracking-widest text-silver">Product Interest</label>
              <select 
                value={formData.product}
                onChange={e => setFormData({...formData, product: e.target.value})}
                className="w-full bg-white/5 border border-white/10 p-4 text-white outline-none focus:border-gold transition-all appearance-none"
              >
                <option value="" className="bg-steel">Select a product...</option>
                <option value="Square Pipes" className="bg-steel">Square Pipes</option>
                <option value="Rectangular Pipes" className="bg-steel">Rectangular Pipes</option>
                <option value="Roofing Sheets" className="bg-steel">Roofing Sheets</option>
                <option value="MS Bars" className="bg-steel">MS Bars & Rods</option>
                <option value="Angles & Channels" className="bg-steel">Angles & Channels</option>
                <option value="Other" className="bg-steel">Other Requirements</option>
              </select>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-bold uppercase tracking-widest text-silver">Message / Requirements</label>
              <textarea 
                required
                value={formData.message}
                onChange={e => setFormData({...formData, message: e.target.value})}
                className="w-full bg-white/5 border border-white/10 p-4 text-white outline-none focus:border-gold transition-all min-h-[150px]"
                placeholder="Describe your requirement — quantity, size, purpose..."
              />
            </div>

            <button 
              type="submit"
              disabled={status === 'submitting'}
              className={`w-full md:w-auto px-10 py-4 font-bold uppercase tracking-widest transition-all ${
                status === 'success' ? 'bg-green-600 text-white' : 'bg-rust hover:bg-accent text-white'
              }`}
            >
              {status === 'submitting' ? 'Sending...' : status === 'success' ? '✓ Sent Successfully' : 'Send Enquiry →'}
            </button>
          </form>

          <div className="space-y-6">
            {[
              { icon: <Phone className="text-gold" />, title: 'Call Directly', content: '+91 76280 24273', sub: '+91 98633 89703' },
              { icon: <MessageSquare className="text-gold" />, title: 'WhatsApp Us', content: 'Chat on WhatsApp', sub: 'Quick responses for quotes', link: 'https://wa.me/917628024273' },
              { icon: <MapPin className="text-gold" />, title: 'Our Location', content: 'Burma - Sugnu Road, Irum Lamdong,', sub: 'Kakching, Manipur 795103' }
            ].map((detail, i) => (
              <div key={i} className="bg-white/5 border border-white/5 border-l-2 border-l-gold p-6 flex gap-6">
                <div className="shrink-0">{detail.icon}</div>
                <div>
                  <h4 className="font-teko text-xl font-bold text-white tracking-wide">{detail.title}</h4>
                  <p className="text-silver text-sm font-light mt-1">
                    {detail.link ? <a href={detail.link} target="_blank" className="text-gold hover:underline">{detail.content}</a> : detail.content}
                  </p>
                  <p className="text-silver/60 text-xs mt-0.5">{detail.sub}</p>
                </div>
              </div>
            ))}

            <div className="border border-white/10 overflow-hidden grayscale contrast-125 opacity-70 hover:opacity-100 transition-opacity">
              <iframe
                src="https://maps.google.com/maps?q=Kakching,Manipur,India&z=13&output=embed"
                className="w-full h-[250px]"
                loading="lazy"
                title="Kuber Enterprises Location"
              />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

const Footer = () => {
  return (
    <footer className="bg-[#080e17] border-t-2 border-rust py-12">
      <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-8">
        <div className="font-teko text-3xl font-bold tracking-wider text-white">
          KUBER <span className="text-gold">ENTERPRISES</span>
        </div>
        
        <div className="text-center md:text-left">
          <p className="text-[10px] font-light text-silver uppercase tracking-[0.2em] leading-relaxed">
            © 2026 Kuber Enterprises · Kakching, Manipur 795103 <br />
            Authorized Dealer – Nezone & Kamdhenu Steel Products
          </p>
        </div>

        <div className="flex gap-4 text-xs font-bold text-silver">
          <a href="tel:7628024273" className="text-gold hover:underline">76280 24273</a>
          <span className="opacity-20">|</span>
          <a href="tel:9863389703" className="text-gold hover:underline">98633 89703</a>
        </div>
      </div>
    </footer>
  );
};

const WhatsAppFAB = () => (
  <a 
    href="https://wa.me/917628024273" 
    target="_blank" 
    className="fixed bottom-8 right-8 z-[100] bg-[#25D366] text-white w-14 h-14 rounded-full flex items-center justify-center shadow-2xl hover:scale-110 transition-transform"
  >
    <MessageSquare size={28} />
  </a>
);

export default function App() {
  return (
    <ErrorBoundary>
      <FirebaseProvider>
        <div className="relative">
          <Navbar />
          <Hero />
          <Ticker />
          <Brands />
          <Products />
          <WhyUs />
          <Contact />
          <Footer />
          <WhatsAppFAB />
        </div>
      </FirebaseProvider>
    </ErrorBoundary>
  );
}
