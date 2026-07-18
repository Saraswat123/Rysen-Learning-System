export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { db } from '@/lib/db'

// MCQ banks keyed by stage title keywords
const MCQ_BANKS: Record<string, Array<{ text: string; options: string[]; correctIndex: number; explanation: string }>> = {
  'welcome': [
    {
      text: 'What does RYSEN stand for in the context of its learning philosophy?',
      options: ['Rise, Yield, Succeed, Elevate, Navigate', 'Reach Your Standard of Excellence Now', 'Rapid Youth Skills and Education Network', 'Resilience, Youth, Skills, Empowerment, Nurturing'],
      correctIndex: 1,
      explanation: 'RYSEN stands for "Reach Your Standard of Excellence Now" — the core philosophy driving every educator and student.',
    },
    {
      text: 'What is the primary goal of the Welcome Week stage?',
      options: ['Complete all MCQ assessments', 'Understand RYSEN culture, values and your role as an educator', 'Set up your educator portal account', 'Submit your first task assignment'],
      correctIndex: 1,
      explanation: 'Welcome Week introduces educators to RYSEN culture, values, and expectations before diving into skills training.',
    },
    {
      text: 'Which of the following best describes the RYSEN educator\'s responsibility?',
      options: ['Only deliver curriculum content as instructed', 'Inspire, guide and empower students to reach their own standard of excellence', 'Manage administrative tasks for the principal', 'Focus solely on student exam scores'],
      correctIndex: 1,
      explanation: 'Educators at RYSEN are expected to inspire and empower — not just deliver content.',
    },
    {
      text: 'How many campuses does RYSEN Learning Centre currently operate across?',
      options: ['5', '10', '15', '20'],
      correctIndex: 2,
      explanation: 'RYSEN operates across 15 campuses, serving students and educators at multiple locations.',
    },
    {
      text: 'What should an educator do when a student is struggling to understand a concept?',
      options: ['Move on to the next topic to maintain schedule', 'Refer the student to self-study materials only', 'Adapt their teaching approach and provide additional support', 'Report the student to the principal immediately'],
      correctIndex: 2,
      explanation: 'RYSEN educators are trained to adapt and support — every student can reach their standard of excellence with the right guidance.',
    },
  ],
  'rysen way': [
    {
      text: 'What is the RYSEN Way of teaching primarily focused on?',
      options: ['Strict curriculum adherence at all times', 'Student-centred, outcome-driven learning experiences', 'Technology-only delivery of lessons', 'Assessment and grading above all else'],
      correctIndex: 1,
      explanation: 'The RYSEN Way puts the student at the centre — outcomes and real learning matter more than rigid curriculum delivery.',
    },
    {
      text: 'According to RYSEN\'s core values, how should educators handle classroom conflict?',
      options: ['Ignore minor conflicts and focus on teaching', 'Escalate all conflicts to the principal immediately', 'Address conflicts calmly with empathy and clear communication', 'Remove the disruptive student from class'],
      correctIndex: 2,
      explanation: 'RYSEN values empathy and clear communication as the first response to any classroom conflict.',
    },
    {
      text: 'Which communication style best reflects the RYSEN Way with parents?',
      options: ['Share only exam results at the end of term', 'Communicate proactively, regularly and constructively with parents', 'Only contact parents when there is a problem', 'Let the principal handle all parent communications'],
      correctIndex: 1,
      explanation: 'Proactive, regular and constructive parent communication is a cornerstone of the RYSEN educator standard.',
    },
    {
      text: 'What does "student-centred learning" mean at RYSEN?',
      options: ['Students choose which subjects to attend', 'Teaching pace and methods adapt to individual student needs and progress', 'Students self-study without educator involvement', 'Students decide the curriculum content'],
      correctIndex: 1,
      explanation: 'Student-centred means the educator observes, adapts and responds to each student\'s learning journey.',
    },
    {
      text: 'How should an educator approach lesson planning at RYSEN?',
      options: ['Use the same lesson plan for every class', 'Plan with clear learning outcomes, differentiated activities and assessment checkpoints', 'Focus only on delivering the textbook content', 'Plan weekly, not daily, to save time'],
      correctIndex: 1,
      explanation: 'Effective RYSEN lesson plans are outcome-driven with differentiation built in for diverse learners.',
    },
  ],
  'skills': [
    {
      text: 'Which of the following is a key skill RYSEN educators must develop?',
      options: ['Memorising all curriculum content', 'Formative assessment and feedback delivery', 'Completing administrative forms quickly', 'Avoiding parent meetings'],
      correctIndex: 1,
      explanation: 'Formative assessment — checking understanding during learning — is a critical RYSEN educator skill.',
    },
    {
      text: 'What is the difference between formative and summative assessment?',
      options: ['Formative is at end of term; summative is ongoing', 'Formative is ongoing during learning; summative evaluates final outcomes', 'They are the same thing', 'Summative is for students; formative is for teachers'],
      correctIndex: 1,
      explanation: 'Formative = during learning (quizzes, checks). Summative = end of unit/term evaluation.',
    },
    {
      text: 'When giving feedback to a student, the RYSEN approach is to:',
      options: ['Focus only on what went wrong', 'Give general praise without specifics', 'Be specific, actionable and balanced — acknowledge strengths and guide improvement', 'Wait until the end of term to give feedback'],
      correctIndex: 2,
      explanation: 'RYSEN feedback must be specific, timely and actionable — not generic praise or criticism.',
    },
    {
      text: 'What skill should an educator prioritise when a lesson isn\'t engaging students?',
      options: ['Continue delivering the lesson as planned', 'Adaptive teaching — change activity, pacing or delivery method in real time', 'Ask the class to be quiet and pay attention', 'End the lesson early'],
      correctIndex: 1,
      explanation: 'Adaptive teaching is core to RYSEN\'s skills framework — read the room and pivot when needed.',
    },
    {
      text: 'Which of the following reflects strong classroom management at RYSEN?',
      options: ['Strict silence rules at all times', 'Flexible routines, clear expectations and positive reinforcement', 'Punishing every behaviour issue', 'Letting students manage the class themselves'],
      correctIndex: 1,
      explanation: 'RYSEN classroom management balances structure with positive reinforcement and clear expectations.',
    },
  ],
  'leading': [
    {
      text: 'What does leadership mean for an educator at RYSEN?',
      options: ['Managing other educators', 'Taking ownership of student outcomes and modelling excellence', 'Directing the school\'s administration', 'Only applies to senior educators'],
      correctIndex: 1,
      explanation: 'Every RYSEN educator is a leader — owning student outcomes and modelling the standard they set.',
    },
    {
      text: 'How should a RYSEN educator lead by example?',
      options: ['Arrive on time, be prepared, and maintain professional conduct consistently', 'Demonstrate authority in the classroom', 'Follow every instruction without question', 'Focus on personal career growth first'],
      correctIndex: 0,
      explanation: 'Leading by example at RYSEN means consistent professionalism — punctuality, preparation and conduct.',
    },
    {
      text: 'What is the role of a RYSEN educator in a team setting?',
      options: ['Compete with peers for recognition', 'Collaborate, share resources and support colleagues to elevate the whole team', 'Work independently without sharing methods', 'Only share information when asked by the principal'],
      correctIndex: 1,
      explanation: 'RYSEN is a team — collaboration and knowledge sharing raise the standard for everyone.',
    },
    {
      text: 'When a colleague is struggling, a RYSEN educator should:',
      options: ['Ignore it — their problem to solve', 'Report them to the principal', 'Offer support and share strategies that have worked', 'Wait for the principal to intervene'],
      correctIndex: 2,
      explanation: 'RYSEN culture is built on peer support — experienced educators lift up their colleagues.',
    },
    {
      text: 'What does continuous professional development mean at RYSEN?',
      options: ['Attending one training per year', 'Actively seeking feedback, completing training stages and applying new skills in class', 'Reading education articles occasionally', 'Only mandatory training set by the principal'],
      correctIndex: 1,
      explanation: 'RYSEN educators are expected to grow continuously — these training stages are part of that commitment.',
    },
  ],
  'default': [
    {
      text: 'What is the primary mission of RYSEN Learning Centre?',
      options: ['To operate the largest number of campuses in India', 'To help every student reach their own standard of excellence through quality education', 'To maximise enrolment numbers across campuses', 'To deliver only STEM-focused curriculum'],
      correctIndex: 1,
      explanation: 'RYSEN\'s mission is centred on student excellence — every decision and action flows from this.',
    },
    {
      text: 'Which value is central to the RYSEN educator identity?',
      options: ['Compliance', 'Accountability and ownership of student outcomes', 'Competition with peers', 'Strict adherence to timetables'],
      correctIndex: 1,
      explanation: 'Accountability — taking ownership of what happens in your classroom — defines the RYSEN educator.',
    },
    {
      text: 'How should an educator respond to a student who has failed a stage quiz?',
      options: ['Mark them as failing and move on', 'Encourage them, identify the gaps and support them to attempt again', 'Refer them to remedial classes only', 'Inform parents immediately without context'],
      correctIndex: 1,
      explanation: 'RYSEN allows multiple attempts — failure is a learning signal, not a final verdict.',
    },
    {
      text: 'What is the correct way to use the RYSEN educator portal?',
      options: ['Only log in to mark attendance', 'Use it to track task completion, student progress and stay updated on training stages', 'Ignore digital tools and rely on paper records', 'Only use it when directed by the principal'],
      correctIndex: 1,
      explanation: 'The educator portal is the central hub — task tracking, training stages and progress monitoring all live here.',
    },
    {
      text: 'At RYSEN, who is responsible for student success in the classroom?',
      options: ['The principal', 'The student alone', 'The educator, student and parents — a shared responsibility', 'The curriculum designers'],
      correctIndex: 2,
      explanation: 'RYSEN believes in shared responsibility — educator, student and parent all play a role in student success.',
    },
  ],
}

function getBankForStage(title: string) {
  const t = title.toLowerCase()
  if (t.includes('welcome')) return MCQ_BANKS['welcome']
  if (t.includes('rysen way') || t.includes('way')) return MCQ_BANKS['rysen way']
  if (t.includes('skill')) return MCQ_BANKS['skills']
  if (t.includes('lead')) return MCQ_BANKS['leading']
  return MCQ_BANKS['default']
}

export async function POST() {
  try {
    // Find Orientation Program
    const program = await db.program.findFirst({
      where: { name: { contains: 'Orientation', mode: 'insensitive' } },
      include: {
        stages: {
          include: { _count: { select: { questions: true } } },
          orderBy: { number: 'asc' },
        },
      },
    })

    if (!program) {
      return NextResponse.json({ error: 'Orientation Program not found' }, { status: 404 })
    }

    const results: Array<{ stage: string; questionsAdded: number; skipped: boolean }> = []

    for (const stage of program.stages) {
      if (stage._count.questions > 0) {
        results.push({ stage: stage.title, questionsAdded: 0, skipped: true })
        continue
      }

      const bank = getBankForStage(stage.title)

      const questions = bank.map((q, idx) => {
        const options = q.options.map((text, i) => ({ id: `opt-${idx}-${i}`, text }))
        const correctId = options[q.correctIndex].id
        return {
          stageId: stage.id,
          type: 'MCQ' as const,
          text: q.text,
          options: JSON.stringify(options),
          correctId,
          explanation: q.explanation,
          order: idx,
        }
      })

      await db.question.createMany({ data: questions })
      results.push({ stage: stage.title, questionsAdded: questions.length, skipped: false })
    }

    return NextResponse.json({ program: program.name, results })
  } catch (err) {
    console.error('[seed-orientation-mcq]', err)
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
