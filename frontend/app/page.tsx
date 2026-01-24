"use client";

import React, { useRef, useState, useMemo } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import {
  Text,
  Float,
  Stars,
  MeshDistortMaterial,
  Environment,
} from "@react-three/drei";
import * as THREE from "three";
import { motion } from "framer-motion";
import { ArrowRight, Brain, Zap, Globe } from "lucide-react";
import Link from 'next/link';
import { useAuth } from './lib/auth-context';

// --- 3D Components ---

// 1. 浮遊する英単語パーティクル
function FloatingWords({ count = 15 }) {
  const words = [
    "FLUENCY", "SPEAK", "LISTEN", "GROWTH", "FUTURE", 
    "GLOBAL", "AI", "NEURAL", "CONNECT", "VISION",
    "AWAKEN", "SKILL", "LEVEL UP", "CORE", "MIND"
  ];
  
  const wordData = useMemo(() => {
    return new Array(count).fill(0).map(() => ({
      position: [
        (Math.random() - 0.5) * 15,
        (Math.random() - 0.5) * 10,
        (Math.random() - 0.5) * 10,
      ] as [number, number, number],
      word: words[Math.floor(Math.random() * words.length)],
      factor: 0.2 + Math.random(),
      speed: 0.01 + Math.random() / 50,
    }));
  }, [count, words]);

  return (
    <>
      {wordData.map((data, i) => (
        <Word key={i} {...data} />
      ))}
    </>
  );
}

function Word({ position, word, factor, speed }: any) {
  const ref = useRef<THREE.Mesh>(null);
  
  useFrame((state) => {
    const t = state.clock.getElapsedTime();
    if (ref.current) {
      ref.current.position.y = position[1] + Math.sin(t * factor) * 1;
      ref.current.position.x = position[0] + Math.cos(t * speed) * 0.5;
      ref.current.rotation.z = Math.sin(t * 0.1) * 0.1;
    }
  });

  return (
    <Float speed={2} rotationIntensity={0.5} floatIntensity={0.5}>
      <Text
        ref={ref}
        position={position}
        fontSize={0.4}
        color="#a5b4fc" // Indigo-300
        font="https://fonts.gstatic.com/s/inter/v12/UcCO3FwrK3iLTeHuS_fvQtMwCp50KnMw2boKoduKmMEVuLyfAZ9hjp-Ek-_EeA.woff"
        fillOpacity={0.7}
      >
        {word}
      </Text>
    </Float>
  );
}

// 2. メインの「言語コア」 (AI Brain)
function NeuralCore() {
  const meshRef = useRef<THREE.Mesh>(null);
  const [hovered, setHover] = useState(false);

  useFrame((state) => {
    if (meshRef.current) {
      // 常に回転
      meshRef.current.rotation.x = state.clock.getElapsedTime() * 0.2;
      meshRef.current.rotation.y = state.clock.getElapsedTime() * 0.3;
      
      // マウス位置に応じて少し傾く
      const x = (state.mouse.x * Math.PI) / 10;
      const y = (state.mouse.y * Math.PI) / 10;
      meshRef.current.rotation.x += y;
      meshRef.current.rotation.y += x;
    }
  });

  return (
    <Float speed={4} rotationIntensity={1} floatIntensity={2}>
      <mesh
        ref={meshRef}
        scale={hovered ? 2.2 : 2}
        onPointerOver={() => setHover(true)}
        onPointerOut={() => setHover(false)}
      >
        <icosahedronGeometry args={[1, 15]} />
        <MeshDistortMaterial
          color={hovered ? "#4f46e5" : "#312e81"} // Indigo-600 to Indigo-900
          envMapIntensity={1}
          clearcoat={1}
          clearcoatRoughness={0.1}
          metalness={0.5}
          distort={0.4} // 歪み効果で「生きている」感じを出す
          speed={2}
        />
      </mesh>
      {/* コアの周りの光の輪 */}
      <mesh scale={2.5}>
        <sphereGeometry args={[1, 32, 32]} />
        <meshBasicMaterial
          color="#6366f1"
          transparent
          opacity={0.1}
          wireframe
        />
      </mesh>
    </Float>
  );
}

// 3. 背景のパーティクルフィールド
function ParticleField() {
  return (
    <Stars
      radius={100}
      depth={50}
      count={5000}
      factor={4}
      saturation={0}
      fade
      speed={1}
    />
  );
}

// --- UI Components ---

const HeroOverlay = () => {
  const { loading } = useAuth();

  return (
    <div className="absolute inset-0 z-10 flex flex-col items-center justify-center pointer-events-none select-none">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 1, delay: 0.5 }}
        className="text-center px-4"
      >
        <div className="mb-4 inline-block px-4 py-1.5 rounded-full bg-white/10 backdrop-blur-md border border-white/20 text-cyan-300 text-sm font-mono tracking-wider">
          AI-POWERED LANGUAGE EVOLUTION
        </div>
        
        <h1 className="text-5xl md:text-8xl font-black text-transparent bg-clip-text bg-gradient-to-b from-white via-white to-white/20 tracking-tighter mb-6 drop-shadow-[0_0_30px_rgba(255,255,255,0.3)]">
          BEYOND<br />
          FLUENCY
        </h1>
        
        <p className="text-gray-400 text-lg md:text-xl max-w-2xl mx-auto mb-10 leading-relaxed font-light">
          話せるようになる、では終わらせない。<br />
          <span className="text-white font-medium">英語で"思考する"自分へ。</span><br />
          AIとの対話が、あなたの脳を次世代へアップデートする。
        </p>

        <div className="flex justify-center items-center pointer-events-auto">
          <Link href="/login" className="inline-block">
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="group relative px-8 py-4 bg-white text-black font-bold rounded-full overflow-hidden flex items-center justify-center gap-2 shadow-[0_0_40px_rgba(255,255,255,0.3)] mx-auto"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-cyan-400 to-blue-500 opacity-0 group-hover:opacity-20 transition-opacity" />
              <span>Start Training</span>
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </motion.button>
          </Link>
        </div>
      </motion.div>
    </div>
  );
};

const FeatureCard = ({ icon: Icon, title, desc, delay }: any) => (
  <motion.div
    initial={{ opacity: 0, y: 50 }}
    whileInView={{ opacity: 1, y: 0 }}
    viewport={{ once: true }}
    transition={{ duration: 0.8, delay }}
    className="bg-black/40 backdrop-blur-xl border border-white/10 p-8 rounded-2xl hover:border-cyan-500/50 transition-colors group"
  >
    <div className="w-12 h-12 bg-gradient-to-br from-blue-500/20 to-purple-500/20 rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
      <Icon className="w-6 h-6 text-cyan-400" />
    </div>
    <h3 className="text-xl font-bold text-white mb-3">{title}</h3>
    <p className="text-gray-400 leading-relaxed">{desc}</p>
  </motion.div>
);

export default function LandingPage() {
  return (
    <main className="w-full min-h-screen bg-[#050505] text-white overflow-x-hidden">
      {/* Section 1: 3D Hero */}
      <section className="relative h-screen w-full">
        <div className="absolute inset-0 z-0">
          <Canvas camera={{ position: [0, 0, 8], fov: 45 }}>
            <color attach="background" args={["#050505"]} />
            <fog attach="fog" args={["#050505", 5, 20]} />
            
            <ambientLight intensity={0.5} />
            <spotLight position={[10, 10, 10]} angle={0.15} penumbra={1} intensity={1} color="#4f46e5" />
            <pointLight position={[-10, -10, -10]} intensity={1} color="#06b6d4" />
            
            <NeuralCore />
            <FloatingWords />
            <ParticleField />
            
            {/* ポストプロセス的な環境光 */}
            <Environment preset="city" />
          </Canvas>
        </div>
        
        <HeroOverlay />
        
        {/* Scroll Indicator */}
        <motion.div 
          animate={{ y: [0, 10, 0] }}
          transition={{ repeat: Infinity, duration: 2 }}
          className="absolute bottom-10 left-1/2 -translate-x-1/2 z-10 text-white/30"
        >
          <div className="w-[1px] h-16 bg-gradient-to-b from-transparent via-white/50 to-transparent" />
        </motion.div>
      </section>

      {/* Section 2: Features (Glassmorphism) */}
      <section className="relative py-32 px-6 md:px-12 max-w-7xl mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <FeatureCard 
            icon={Brain}
            title="Neural Sync"
            desc="あなたの発話をAIが瞬時に解析。文法だけでなく、ニュアンスや感情まで理解し、最適な表現をフィードバック。"
            delay={0.2}
          />
          <FeatureCard 
            icon={Zap}
            title="Real-time Flow"
            desc="待ち時間ゼロの高速レスポンス。実際の英会話と同じスピード感で、脳の処理速度を英語脳へと加速させる。"
            delay={0.4}
          />
          <FeatureCard 
            icon={Globe}
            title="Global Context"
            desc="世界中の最新ニュースを教材化。単なる語学学習を超え、世界のトレンドを英語で議論する知性を養う。"
            delay={0.6}
          />
        </div>
      </section>

    </main>
  );
}
