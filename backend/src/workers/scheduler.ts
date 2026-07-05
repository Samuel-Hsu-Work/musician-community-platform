import cron from 'node-cron';
// import { generateDailyContent } from './dailyContent.worker';

// Schedule background jobs
export const startScheduler = () => {
  // Example: Run daily at midnight
  // cron.schedule('0 0 * * *', generateDailyContent);
  
  console.log('Scheduler started - Workers configured');
};
