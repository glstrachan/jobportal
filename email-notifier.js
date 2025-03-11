const nodemailer = require('nodemailer');

class EmailNotifier {
    constructor(config) {
        this.config = config;
        this.transporter = nodemailer.createTransport({
            service: 'gmail',  // Can be changed to any service supported by nodemailer
            auth: {
                user: config.email,
                pass: config.password // This should be an app password, not your regular password
            }
        });
    }

    async sendNewJobsNotification(newJobs) {
        if (newJobs.length === 0) {
            console.log('No new jobs to notify about');
            return;
        }

        // Create HTML content with job details
        const jobsHtml = newJobs.map(job => `
            <div style="margin-bottom: 20px; padding: 10px; border: 1px solid #ddd; border-radius: 5px;">
                <h3><a href="${job.url}">${job.name}</a></h3>
                <p><strong>Company:</strong> ${job.company}</p>
                <p><strong>Location:</strong> ${job.location}</p>
                <p><strong>Duration:</strong> ${job.seasonDuration}</p>
                ${job.extra.department ? `<p><strong>Department:</strong> ${job.extra.department}</p>` : ''}
                <p><a href="${job.url}">View Job</a></p>
            </div>
        `).join('');

        const mailOptions = {
            from: this.config.email,
            to: this.config.recipientEmail,
            subject: `🚨 ${newJobs.length} New Job Posting${newJobs.length > 1 ? 's' : ''} Found!`,
            html: `
                <h1>New Job Postings Found</h1>
                <p>We found ${newJobs.length} new job posting${newJobs.length > 1 ? 's' : ''} that might interest you:</p>
                ${jobsHtml}
                <p>This is an automated notification from your job scraper.</p>
            `
        };

        try {
            const info = await this.transporter.sendMail(mailOptions);
            console.log(`Email sent: ${info.messageId}`);
            return info;
        } catch (error) {
            console.error('Error sending email:', error);
            throw error;
        }
    }
}

module.exports = EmailNotifier;