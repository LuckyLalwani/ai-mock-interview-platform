import type { ExperienceLevel, QuestionCategory } from '@/types';

export interface GeneratedQuestion {
  question_text: string;
  category: QuestionCategory;
}

interface QuestionTemplate {
  text: string;
  category: QuestionCategory;
  topics: string[];
}

const QUESTION_BANK: QuestionTemplate[] = [
  // Data Structures
  { text: 'Explain the difference between an array and a linked list. When would you choose one over the other?', category: 'technical', topics: ['data structures', 'arrays', 'linked lists'] },
  { text: 'What is a hash map, and how does it handle collisions? Describe a common collision resolution strategy.', category: 'technical', topics: ['data structures', 'hash maps', 'hash tables'] },
  { text: 'Implement a function to reverse a linked list. Walk through your approach step by step.', category: 'technical', topics: ['data structures', 'linked lists'] },
  { text: 'Explain the difference between a stack and a queue. Give a real-world example of where each would be useful.', category: 'technical', topics: ['data structures', 'stacks', 'queues'] },
  { text: 'What is a binary search tree? How does it maintain order, and what is its time complexity for search, insert, and delete?', category: 'technical', topics: ['data structures', 'trees', 'binary search tree'] },
  { text: 'Describe how a priority queue works and name a data structure commonly used to implement it.', category: 'technical', topics: ['data structures', 'heaps', 'priority queue'] },
  { text: 'Given an array of integers, find the two numbers that sum to a target value. Explain your approach and its time complexity.', category: 'technical', topics: ['data structures', 'arrays', 'algorithms'] },
  { text: 'Explain what a graph is and the difference between breadth-first search and depth-first search traversal.', category: 'technical', topics: ['data structures', 'graphs', 'algorithms'] },

  // Algorithms
  { text: 'Explain the difference between quicksort and mergesort. What are their time and space complexities?', category: 'technical', topics: ['algorithms', 'sorting'] },
  { text: 'What is dynamic programming? Describe a problem where it would be an appropriate approach.', category: 'technical', topics: ['algorithms', 'dynamic programming'] },
  { text: 'Explain binary search. What are its preconditions, and what is its time complexity?', category: 'technical', topics: ['algorithms', 'binary search', 'searching'] },
  { text: 'Describe an approach to detect a cycle in a linked list. What is the time complexity of your solution?', category: 'technical', topics: ['algorithms', 'linked lists', 'cycle detection'] },
  { text: 'What is the time complexity of accessing an element in a balanced BST versus a hash table? When would each be preferred?', category: 'technical', topics: ['algorithms', 'time complexity', 'data structures'] },
  { text: 'Explain memoization and how it differs from tabulation. When would you use each?', category: 'technical', topics: ['algorithms', 'dynamic programming', 'memoization'] },

  // System Design
  { text: 'Design a URL shortening service like bit.ly. Walk through the components, data model, and scaling considerations.', category: 'system_design', topics: ['system design', 'scalability', 'web services'] },
  { text: 'How would you design a rate limiter for an API? Discuss different strategies and their trade-offs.', category: 'system_design', topics: ['system design', 'rate limiting', 'api design'] },
  { text: 'Design a chat application that supports real-time messaging. What components would you need and how would they scale?', category: 'system_design', topics: ['system design', 'real-time', 'websockets'] },
  { text: 'How would you design a distributed cache? Discuss consistency, eviction policies, and failure handling.', category: 'system_design', topics: ['system design', 'caching', 'distributed systems'] },
  { text: 'Design a notification system that can send emails, SMS, and push notifications. How would you handle delivery guarantees?', category: 'system_design', topics: ['system design', 'messaging', 'notifications'] },
  { text: 'How would you design a system to handle millions of concurrent users? Discuss load balancing, caching, and database scaling.', category: 'system_design', topics: ['system design', 'scalability', 'load balancing'] },
  { text: 'Design a key-value store. Discuss partitioning, replication, and consistency models.', category: 'system_design', topics: ['system design', 'databases', 'distributed systems'] },
  { text: 'How would you design a file storage system like Dropbox or Google Drive? Cover upload, sync, and sharing.', category: 'system_design', topics: ['system design', 'file storage', 'sync'] },

  // Behavioral
  { text: 'Tell me about a time you faced a significant challenge at work. How did you approach it and what was the outcome?', category: 'behavioral', topics: ['behavioral', 'challenges', 'problem solving'] },
  { text: 'Describe a situation where you had a disagreement with a teammate. How did you resolve it?', category: 'behavioral', topics: ['behavioral', 'conflict resolution', 'teamwork'] },
  { text: 'Tell me about a project you are particularly proud of. What was your role and what made it successful?', category: 'behavioral', topics: ['behavioral', 'achievements', 'projects'] },
  { text: 'Describe a time you failed at something. What did you learn from it and how did you apply that learning?', category: 'behavioral', topics: ['behavioral', 'failure', 'growth'] },
  { text: 'Tell me about a time you had to work under a tight deadline. How did you manage your time and priorities?', category: 'behavioral', topics: ['behavioral', 'time management', 'pressure'] },
  { text: 'Describe a situation where you had to influence a decision without having direct authority. How did you approach it?', category: 'behavioral', topics: ['behavioral', 'leadership', 'influence'] },
  { text: 'Tell me about a time you received critical feedback. How did you respond and what changes did you make?', category: 'behavioral', topics: ['behavioral', 'feedback', 'growth'] },
  { text: 'Describe a time when you had to learn a new technology or skill quickly to complete a project. How did you approach the learning process?', category: 'behavioral', topics: ['behavioral', 'learning', 'adaptability'] },
  { text: 'Tell me about a time you went above and beyond what was expected of you. What motivated you to do so?', category: 'behavioral', topics: ['behavioral', 'initiative', 'motivation'] },
  { text: 'Describe a situation where you had to balance competing priorities. How did you decide what to focus on?', category: 'behavioral', topics: ['behavioral', 'prioritization', 'decision making'] },

  // Product Management
  { text: 'How would you prioritize a backlog of features when resources are limited? Walk through your framework.', category: 'technical', topics: ['product management', 'prioritization', 'product'] },
  { text: 'Describe how you would measure the success of a newly launched feature. What metrics would you track?', category: 'technical', topics: ['product management', 'metrics', 'analytics', 'product'] },
  { text: 'Walk me through how you would improve a product you use every day. What would you change and why?', category: 'technical', topics: ['product management', 'product sense', 'product'] },
  { text: 'How would you decide whether to build, buy, or partner for a given capability? Discuss your decision framework.', category: 'technical', topics: ['product management', 'strategy', 'product'] },
  { text: 'A key metric drops 20% overnight. Walk me through your investigation process.', category: 'technical', topics: ['product management', 'analytics', 'metrics', 'product'] },

  // Databases
  { text: 'Explain the difference between SQL and NoSQL databases. When would you choose each?', category: 'technical', topics: ['databases', 'sql', 'nosql'] },
  { text: 'What is database indexing? Explain how indexes improve query performance and when they can hurt.', category: 'technical', topics: ['databases', 'indexing', 'sql', 'performance'] },
  { text: 'Describe database normalization. What are the common normal forms and why do they matter?', category: 'technical', topics: ['databases', 'normalization', 'sql', 'database design'] },
  { text: 'Explain ACID properties in the context of database transactions. Why are they important?', category: 'technical', topics: ['databases', 'transactions', 'acid', 'sql'] },
  { text: 'What is the difference between optimistic and pessimistic locking? When would you use each?', category: 'technical', topics: ['databases', 'concurrency', 'locking'] },

  // Web Development
  { text: 'Explain the request-response lifecycle of a web application. What happens between a user clicking a link and seeing the page?', category: 'technical', topics: ['web development', 'http', 'web'] },
  { text: 'What is the difference between REST and GraphQL? Discuss the trade-offs of each approach.', category: 'technical', topics: ['web development', 'api design', 'rest', 'graphql'] },
  { text: 'Explain how browser caching works and how you would use it to improve application performance.', category: 'technical', topics: ['web development', 'caching', 'performance', 'web'] },
  { text: 'What is CORS and why is it important for web security? How do you configure it properly?', category: 'technical', topics: ['web development', 'security', 'cors', 'web'] },
  { text: 'Describe the difference between client-side and server-side rendering. When would you choose each?', category: 'technical', topics: ['web development', 'rendering', 'ssr', 'csr', 'web'] },

  // General / Object-Oriented Programming
  { text: 'Explain the four pillars of object-oriented programming with examples.', category: 'technical', topics: ['oop', 'object oriented programming', 'programming'] },
  { text: 'What is the difference between an interface and an abstract class? When would you use each?', category: 'technical', topics: ['oop', 'interfaces', 'programming'] },
  { text: 'Explain the concept of dependency injection and its benefits. Give a practical example.', category: 'technical', topics: ['oop', 'design patterns', 'dependency injection', 'programming'] },

  // Machine Learning / Data Science
  { text: 'Explain the difference between supervised and unsupervised learning. Give examples of each.', category: 'technical', topics: ['machine learning', 'data science', 'ai', 'ml'] },
  { text: 'What is overfitting in machine learning? How do you detect and prevent it?', category: 'technical', topics: ['machine learning', 'overfitting', 'ml', 'data science'] },
  { text: 'Explain the bias-variance trade-off. Why is it important in model selection?', category: 'technical', topics: ['machine learning', 'bias variance', 'ml', 'data science'] },
  { text: 'Describe how you would approach a data science project from problem definition to deployment.', category: 'technical', topics: ['data science', 'ml', 'data'] },
  { text: 'What evaluation metrics would you use for a classification problem? How do you choose between them?', category: 'technical', topics: ['machine learning', 'metrics', 'data science', 'ml'] },
];

const QUICK_MODES: Record<string, { topics: string[]; category: QuestionCategory }> = {
  'Technical – Data Structures': { topics: ['data structures', 'algorithms'], category: 'technical' },
  'Behavioral': { topics: ['behavioral'], category: 'behavioral' },
  'System Design': { topics: ['system design', 'scalability'], category: 'system_design' },
  'Algorithms': { topics: ['algorithms', 'time complexity'], category: 'technical' },
  'Databases': { topics: ['databases', 'sql'], category: 'technical' },
  'Web Development': { topics: ['web development', 'api design'], category: 'technical' },
  'Machine Learning': { topics: ['machine learning', 'data science'], category: 'technical' },
  'Product Management': { topics: ['product management', 'metrics'], category: 'technical' },
};

export const QUICK_MODE_KEYS = Object.keys(QUICK_MODES);

function normalizeTopic(topic: string): string {
  return topic.toLowerCase().trim();
}

function topicMatches(questionTopics: string[], userTopics: string[]): boolean {
  const normalizedUser = userTopics.map(normalizeTopic);
  return questionTopics.some((qt) =>
    normalizedUser.some((ut) => qt.includes(ut) || ut.includes(qt))
  );
}

function shuffle<T>(arr: T[]): T[] {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

export function generateQuestions(
  topics: string[],
  count: number,
  category?: QuestionCategory
): GeneratedQuestion[] {
  let pool = QUESTION_BANK.filter((q) => topicMatches(q.topics, topics));
  if (category) {
    const filtered = pool.filter((q) => q.category === category);
    if (filtered.length > 0) pool = filtered;
  }

  if (pool.length === 0) {
    pool = QUESTION_BANK.filter((q) => topicMatches(q.topics, ['behavioral']));
  }

  const shuffled = shuffle(pool);
  const selected = shuffled.slice(0, Math.min(count, shuffled.length));

  // If we don't have enough unique questions, pad with shuffled repeats
  if (selected.length < count) {
    while (selected.length < count) {
      const more = shuffle(pool);
      for (const q of more) {
        if (selected.length >= count) break;
        selected.push(q);
      }
    }
  }

  return selected.map((q) => ({
    question_text: q.text,
    category: q.category,
  }));
}

export function getQuickModeTopics(mode: string): string[] {
  return QUICK_MODES[mode]?.topics ?? [];
}

export function getQuickModeCategory(mode: string): QuestionCategory | undefined {
  return QUICK_MODES[mode]?.category;
}

export function generateFeedback(
  questions: { question_text: string; answer_text: string | null; category: string | null }[]
): { strengths: string[]; improvements: string[]; overall: string } {
  const answered = questions.filter((q) => q.answer_text && q.answer_text.trim().length > 0);
  const unanswered = questions.length - answered.length;

  const strengths: string[] = [];
  const improvements: string[] = [];

  if (answered.length === 0) {
    return {
      strengths: [],
      improvements: ['Attempt all questions to receive meaningful feedback on your performance.'],
      overall: 'No answers were recorded during this interview. Try to answer each question, even if you are unsure, to get the most out of your practice sessions.',
    };
  }

  const avgAnswerLength = answered.reduce((sum, q) => sum + (q.answer_text?.length ?? 0), 0) / answered.length;

  if (avgAnswerLength > 300) {
    strengths.push('Your answers are detailed and thorough, showing depth of thought.');
  } else if (avgAnswerLength > 100) {
    strengths.push('Your answers are concise and to the point, effectively communicating key ideas.');
  } else {
    improvements.push('Try to elaborate more on your answers — aim for at least a few sentences per question to demonstrate your understanding.');
  }

  if (answered.length === questions.length) {
    strengths.push('You attempted every question, showing persistence and engagement throughout the interview.');
  } else if (unanswered > 2) {
    improvements.push(`${unanswered} questions were left unanswered. Practice pacing yourself so you can address each question within the allotted time.`);
  } else {
    improvements.push(`${unanswered} question(s) were left unanswered. Try to manage your time to cover all questions.`);
  }

  const behavioralCount = answered.filter((q) => q.category === 'behavioral').length;
  const technicalCount = answered.filter((q) => q.category === 'technical').length;
  const systemDesignCount = answered.filter((q) => q.category === 'system_design').length;

  if (behavioralCount > 0) {
    strengths.push('You engaged well with behavioral questions, which are critical for demonstrating communication and collaboration skills.');
  }
  if (technicalCount > 0) {
    strengths.push('You tackled technical questions, showing your problem-solving and domain knowledge.');
  }
  if (systemDesignCount > 0) {
    strengths.push('You addressed system design questions, demonstrating your ability to think about architecture and scale.');
  }

  const shortAnswers = answered.filter((q) => (q.answer_text?.length ?? 0) < 50).length;
  if (shortAnswers > answered.length / 2) {
    improvements.push('Several answers were quite brief. Consider using frameworks like STAR (Situation, Task, Action, Result) for behavioral questions and structured explanations for technical ones.');
  }

  improvements.push('Review the questions you found challenging and practice similar ones to build confidence in those areas.');

  const completionRate = Math.round((answered.length / questions.length) * 100);
  const overall = `You completed ${answered.length} of ${questions.length} questions (${completionRate}% completion rate). ${avgAnswerLength > 200 ? 'Your responses showed good depth and detail.' : 'Focus on adding more structure and detail to your responses.'} Continue practicing regularly to build confidence and improve your interview performance.`;

  return { strengths, improvements, overall };
}

export function generatePerQuestionFeedback(answer: string): { score: number; notes: string } {
  const len = answer.trim().length;
  if (len === 0) {
    return { score: 0, notes: 'No answer provided.' };
  }
  if (len < 50) {
    return { score: 3, notes: 'Answer is very brief. Consider elaborating with more detail and examples.' };
  }
  if (len < 150) {
    return { score: 6, notes: 'Decent answer with some substance. Adding specific examples or more detail would strengthen it.' };
  }
  if (len < 400) {
    return { score: 8, notes: 'Well-structured answer with good detail. Consider refining for clarity and impact.' };
  }
  return { score: 9, notes: 'Comprehensive and thorough answer. Well done articulating your thoughts in detail.' };
}
