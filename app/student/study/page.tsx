'use client'

import { useState, useEffect } from 'react'
import { BookOpen, ChevronDown, Lightbulb } from 'lucide-react'

interface Student { class: string }

interface Section { title: string; points: string[] }
interface Band { key: string; label: string; desc: string; sections: Section[] }

const BANDS: Band[] = [
  {
    key: '1-3',
    label: 'Class 1-3',
    desc: 'Covers the STEM & Coding Quiz for Classes 1-3 — basic science and early coding ideas.',
    sections: [
      { title: 'Magnets', points: [
        "A magnet pulls metal objects toward it — this pulling force is called magnetism.",
        'Every magnet has two ends, called the North pole and the South pole.',
      ] },
      { title: 'Electricity & Circuits', points: [
        'A battery stores electricity and gives power to things like a torch.',
        'Electricity flows through a path called a circuit.',
        'Metal lets electricity pass through easily; materials like wood, plastic and rubber do not.',
      ] },
      { title: 'Simple Machines', points: [
        'A pulley is a simple machine that helps lift heavy things.',
      ] },
      { title: 'Floating & Sinking', points: [
        'Light materials like a wooden block float on water; heavy materials like a stone, coin or metal spoon sink.',
      ] },
      { title: 'Coding Basics', points: [
        'A sequence is a set of steps done one after another, in order (e.g. "stand up, then clap").',
        'A loop is when the same steps are repeated again and again.',
      ] },
    ],
  },
  {
    key: '4-6',
    label: 'Class 4-6',
    desc: 'Covers the STEM & Coding Quiz for Classes 4-6 — circuits, logic, microcontrollers and robotics basics.',
    sections: [
      { title: 'Circuits & Electricity', points: [
        'In a series circuit, all bulbs are on one path — if one bulb blows, the circuit breaks and every other bulb goes off too.',
        'AC (alternating current) regularly changes direction; DC (direct current) flows in one direction only — batteries give DC.',
      ] },
      { title: 'Logic Gates', points: [
        'An AND gate only turns its output ON when ALL of its inputs are ON.',
      ] },
      { title: 'Microcontrollers & Arduino', points: [
        'A microcontroller is a tiny computer on a chip that controls electronic devices (like an Arduino).',
        'Digital pins on an Arduino Uno output either HIGH (on) or LOW (off) signals.',
        'In the Arduino Blink sketch, delay(1000) pauses the program for 1000 milliseconds (1 second).',
        "Programs for a Cretile NetLogic board are written and uploaded through its own coding software, connected via USB.",
      ] },
      { title: 'Sensors & Motors', points: [
        'An ultrasonic sensor measures distance by sending out sound waves and timing how long they take to bounce back.',
        'A motor driver (like an L298N) controls how much power and in which direction a motor spins.',
      ] },
      { title: '3D Printing', points: [
        'A 3D printer builds an object layer by layer, usually from melted plastic filament.',
      ] },
    ],
  },
  {
    key: '7-8',
    label: 'Class 7-8',
    desc: 'Covers the STEM & Coding Quiz for Classes 7-8 — ESP32, robotics logic, AI basics and capstone project skills.',
    sections: [
      { title: 'ESP32 & Connectivity', points: [
        'The ESP32 has built-in Wi-Fi and Bluetooth, unlike a basic Arduino Uno — this lets it connect to the internet directly.',
        'In an ESP32 web server project, a browser can turn an LED on/off remotely because the ESP32 hosts a web page that sends commands over Wi-Fi.',
        'An HC-05 module adds Bluetooth communication to an Arduino/ESP32 project.',
      ] },
      { title: 'Robotics Logic', points: [
        'In the Cretile Smart Security Robot, combining two sensor conditions (e.g. an obstacle detected AND low light) can make the robot move forward slowly as a cautious response.',
        'In a line-following robot, if both line sensors read white (no line), the robot has lost the line and usually stops or searches for it.',
      ] },
      { title: 'Arduino Programming', points: [
        'millis() tracks the time (in milliseconds) since the Arduino started running — commonly used to measure reaction time in a game.',
      ] },
      { title: '3D Design', points: [
        'Before designing a part in Tinkercad, measure the real component first — this ensures the printed part actually fits and works.',
      ] },
      { title: 'Artificial Intelligence', points: [
        'Bias in AI means a model makes unfair predictions because its training data or design favoured certain outcomes over others.',
        'Supervised learning trains a model using labeled data (inputs with known correct answers); unsupervised learning finds patterns in data that has no labels.',
        'A common ethics concern with face recognition technology is privacy — tracking or identifying people without their consent.',
      ] },
    ],
  },
]

function bandForClass(cls: string): string {
  const n = parseInt(cls, 10)
  if (isNaN(n)) return '1-3'
  if (n <= 3) return '1-3'
  if (n <= 6) return '4-6'
  return '7-8'
}

export default function StudyGuidePage() {
  const [student, setStudent] = useState<Student | null>(null)
  const [openBands, setOpenBands] = useState<Set<string>>(new Set())

  useEffect(() => {
    fetch('/api/auth/student-me').then((r) => r.json()).then((d) => {
      if (d.student) {
        setStudent(d.student)
        setOpenBands(new Set([bandForClass(d.student.class)]))
      }
    })
  }, [])

  function toggle(key: string) {
    setOpenBands((prev) => {
      const next = new Set(prev)
      next.has(key) ? next.delete(key) : next.add(key)
      return next
    })
  }

  const myBand = student ? bandForClass(student.class) : null

  return (
    <div className="max-w-3xl mx-auto animate-fade-in">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-midnight flex items-center gap-2">
          <BookOpen size={24} /> Study Guide
        </h1>
        <p className="text-sm text-charcoal/60 mt-0.5">Revision notes for the STEM & Coding Quiz, by class group.</p>
      </div>

      <div className="flex flex-col gap-4">
        {BANDS.map((band) => {
          const isOpen = openBands.has(band.key)
          const isMine = band.key === myBand
          return (
            <div key={band.key} className={`bg-white rounded-2xl border overflow-hidden ${isMine ? 'border-gold' : 'border-gray-100'}`}>
              <button
                onClick={() => toggle(band.key)}
                className="w-full flex items-center justify-between px-5 py-4 text-left hover:bg-gray-50/60 transition-colors">
                <div>
                  <span className="font-bold text-midnight flex items-center gap-2">
                    {band.label}
                    {isMine && <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-gold text-midnight">YOUR CLASS</span>}
                  </span>
                  <p className="text-xs text-charcoal/50 mt-0.5">{band.desc}</p>
                </div>
                <ChevronDown size={18} className={`text-charcoal/40 flex-shrink-0 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
              </button>

              {isOpen && (
                <div className="px-5 pb-5 flex flex-col gap-4">
                  {band.sections.map((section) => (
                    <div key={section.title}>
                      <h3 className="text-sm font-bold text-midnight mb-1.5">{section.title}</h3>
                      <ul className="flex flex-col gap-1">
                        {section.points.map((p, i) => (
                          <li key={i} className="text-sm text-charcoal/80 leading-relaxed flex gap-2">
                            <span className="text-midnight/30 flex-shrink-0">•</span>
                            <span>{p}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )
        })}
      </div>

      <div className="mt-6 bg-gold/10 border border-gold/30 rounded-2xl p-4 flex gap-3">
        <Lightbulb size={18} className="text-gold flex-shrink-0 mt-0.5" />
        <p className="text-sm text-charcoal/70">
          <strong>Tip:</strong> Read each point once, then try explaining it out loud in your own words — if you can explain it simply, you know it.
        </p>
      </div>
    </div>
  )
}
