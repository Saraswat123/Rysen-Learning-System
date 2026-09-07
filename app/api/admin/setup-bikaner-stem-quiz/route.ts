export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getSession } from '@/lib/auth'
import { Role } from '@/app/generated/prisma/client'

function isAdmin(role: Role) {
  return role === Role.ADMIN || role === Role.SUPER_ADMIN
}

function opt(id: string, text: string) { return { id, text } }

// Quiz content sourced from the three Google Docs (Class 1-3 / 4-6 / 7-8 STEM & Coding Quiz).
// Class 7-8 doc reused for Class 7 only, per instruction — no class 8 rollout.
const QUIZZES = [
  {
    title: 'STEM & Coding Quiz — Class 1-3',
    targetClass: '1-3',
    subject: 'STEM',
    questions: [
      { text: "What do we call a magnet's ability to pull metal objects toward it?", options: ['Gravity', 'Magnetism', 'Friction', 'Light'], correct: 1 },
      { text: 'A battery gives power to a torch/flashlight because it stores what?', options: ['Water', 'Electricity', 'Air', 'Sound'], correct: 1 },
      { text: 'Which of these is a simple machine that helps lift heavy things?', options: ['Pulley', 'Balloon', 'Mirror', 'Sponge'], correct: 0 },
      { text: 'If you tell a friend "first stand up, then clap your hands" - what is this called in coding?', options: ['A color', 'A sequence', 'A shape', 'A sound'], correct: 1 },
      { text: 'Which material lets electricity pass through it easily?', options: ['Wood', 'Plastic', 'Metal', 'Rubber'], correct: 2 },
      { text: 'What do we call the path electricity flows through in a simple torch?', options: ['A circuit', 'A triangle', 'A recipe', 'A song'], correct: 0 },
      { text: 'A magnet has two ends. What are they called?', options: ['Top and bottom', 'North and South poles', 'Left and right', 'In and out'], correct: 1 },
      { text: 'Which of these floats on water?', options: ['A stone', 'A coin', 'A wooden block', 'A metal spoon'], correct: 2 },
      { text: 'In coding, what do we call it when we repeat the same steps again and again?', options: ['A loop', 'A jump', 'A stop', 'A color'], correct: 0 },
      { text: 'Which of these objects uses a battery to work?', options: ['A book', 'A remote control', 'A pencil', 'A chair'], correct: 1 },
    ],
  },
  {
    title: 'STEM & Coding Quiz — Class 4-6',
    targetClass: '4-6',
    subject: 'STEM',
    questions: [
      { text: 'In a series circuit, if one bulb blows, what happens to the other bulbs?', options: ['They stay the same', 'They go out too', 'They get brighter', 'Nothing changes'], correct: 1 },
      { text: 'What does an AND gate need for its output to turn ON?', options: ['Only one switch pressed', 'Both switches pressed', 'No switches pressed', 'Any switch pressed'], correct: 1 },
      { text: 'What is the difference between AC and DC electricity?', options: ['AC never changes direction', 'DC alternates direction', 'AC alternates direction, DC flows one direction', 'They are the same'], correct: 2 },
      { text: 'What is a microcontroller?', options: ['A type of battery', 'A tiny computer that runs one program to control hardware', 'A magnet', 'A type of wire'], correct: 1 },
      { text: 'On an Arduino Uno, what do digital pins output?', options: ['Only HIGH or LOW (on/off)', 'A range of values', 'Sound only', 'Color only'], correct: 0 },
      { text: 'In the Arduino Blink sketch, what does delay(1000) do?', options: ['Deletes the code', 'Waits 1000 milliseconds (1 second)', 'Repeats forever', 'Turns off the board'], correct: 1 },
      { text: 'What does an ultrasonic sensor measure?', options: ['Temperature', 'Distance', 'Sound volume', 'Light color'], correct: 1 },
      { text: 'On the real Cretile NetLogic board, where do you write and upload programs?', options: ['Arduino IDE', 'app.cretile.com', 'Microsoft Word', 'A physical switch panel'], correct: 1 },
      { text: 'In 3D printing, what does a 3D printer build an object from?', options: ['One solid block, carved down', 'Layers of melted plastic filament, one on top of another', 'Paper folding', 'Liquid poured into a mold'], correct: 1 },
      { text: 'What is the job of a motor driver like the L298N in a robot?', options: ['It stores battery power', 'It lets low-power Arduino pins safely control a higher-power motor', 'It measures light', 'It connects to Wi-Fi'], correct: 1 },
    ],
  },
  {
    title: 'STEM & Coding Quiz — Class 7',
    targetClass: '7',
    subject: 'STEM',
    questions: [
      { text: 'What makes the ESP32 board different from a basic Arduino Uno?', options: ['It has no pins', 'It has built-in Wi-Fi and Bluetooth', 'It cannot run code', 'It only works with batteries'], correct: 1 },
      { text: 'In an ESP32 web server project, what lets a browser turn an LED on/off remotely?', options: ['Bluetooth pairing', 'The ESP32 serving a webpage over Wi-Fi that the browser sends commands to', 'A physical switch only', 'Voice recognition'], correct: 1 },
      { text: 'What is "bias in AI"?', options: ['When an AI runs faster', 'When an AI system reflects unfair patterns present in its training data', 'When an AI has no data', 'When an AI uses too much power'], correct: 1 },
      { text: 'In the Cretile combined sensor logic (Smart Security Robot), what two conditions together make the robot move forward slowly?', options: ['High light AND far obstacle', 'Low light AND far obstacle', 'Low light AND close obstacle', 'High light AND close obstacle'], correct: 1 },
      { text: 'In a line-following robot, what does the robot do if both line sensors read white?', options: ['Moves forward', 'Stops permanently', 'Turns in place to search for the line', 'Turns off'], correct: 2 },
      { text: 'What communication protocol does an HC-05 module add to an Arduino/ESP32 project?', options: ['Wi-Fi', 'Bluetooth', 'USB', 'Ethernet'], correct: 1 },
      { text: 'In 3D design for a capstone project part, why do you measure the real component before designing in Tinkercad?', options: ['To choose a filament color', 'To ensure the printed part physically fits and functions with the real build', 'To save file space', "It's not necessary"], correct: 1 },
      { text: 'What does millis() commonly track in an Arduino reaction-timer game?', options: ['Distance', 'Time elapsed in milliseconds', 'Sound level', 'Battery voltage'], correct: 1 },
      { text: 'What is the main difference between supervised and unsupervised machine learning?', options: ['Supervised learning uses labeled data; unsupervised does not', 'Unsupervised learning uses labeled data; supervised does not', 'They are identical', 'Neither uses data'], correct: 0 },
      { text: 'What safety/ethics concern is commonly discussed with face recognition technology?', options: ['It uses too much electricity', 'Privacy and misuse in public surveillance', 'It cannot detect faces', 'It is too slow'], correct: 1 },
    ],
  },
]

// POST — creates the 3 quizzes (10 MCQs each) directly under Student Tests for the
// main Vyas Colony, Bikaner branch. Auto-matches by name/location — excludes anything
// with "pre" (pre-primary) or "side" in the name. No new group/folder/directory created,
// just plain StudentTest + StudentQuestion rows like any other test in the admin panel.
// Skips a (title, branchId) pair that already exists, so it's safe to re-run.
export async function POST() {
  const user = await getSession()
  if (!user || !isAdmin(user.role)) return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })

  const branches = await db.branch.findMany({
    where: {
      location: { contains: 'Bikaner', mode: 'insensitive' },
      name: { contains: 'Vyas', mode: 'insensitive' },
      NOT: [
        { name: { contains: 'pre', mode: 'insensitive' } },
        { name: { contains: 'side', mode: 'insensitive' } },
      ],
    },
  })
  if (branches.length === 0) {
    return NextResponse.json({ error: 'No main Vyas Colony, Bikaner branch found (excluding pre-primary/side branches)' }, { status: 404 })
  }

  const results: string[] = []

  for (const branch of branches) {
    for (const quiz of QUIZZES) {
      const existing = await db.studentTest.findFirst({ where: { title: quiz.title, branchId: branch.id } })
      if (existing) {
        results.push(`— ${branch.name} / ${quiz.title} (already exists, skipped)`)
        continue
      }

      const test = await db.studentTest.create({
        data: {
          title: quiz.title,
          description: `RYSEN STEM curriculum quiz for ${quiz.targetClass === '7' ? 'Class 7' : `Classes ${quiz.targetClass}`}`,
          subject: quiz.subject,
          targetClass: quiz.targetClass,
          timeLimitMinutes: 15,
          passScore: 60,
          isPublished: true,
          branchId: branch.id,
          createdBy: 'ADMIN',
        },
      })

      await db.studentQuestion.createMany({
        data: quiz.questions.map((q, i) => ({
          testId: test.id,
          type: 'MCQ',
          text: q.text,
          options: q.options.map((t, j) => opt(String.fromCharCode(97 + j), t)),
          correctId: String.fromCharCode(97 + q.correct),
          order: i,
          marks: 1,
        })),
      })

      results.push(`✓ ${branch.name} / ${quiz.title} — 10 questions`)
    }
  }

  return NextResponse.json({ ok: true, branchesProcessed: branches.map((b) => b.name), results })
}
