const puppeteer = require('puppeteer');

class JobPosting {
    constructor({
        name,
        company,
        postDate, // This is now optional
        scrapeDate,
        uniqueIdentifier,
        location,
        seasonDuration,
        url,
        extra = {} // Added extra field for additional information
    }) {
        this.name = name;                             // Job title
        this.company = company;                       // Company name
        this.postDate = postDate;                     // When the job was posted (optional)
        this.scrapeDate = scrapeDate || new Date();   // When we found the job
        this.uniqueIdentifier = uniqueIdentifier;     // Unique ID to avoid duplicates
        this.location = location;                     // Job location
        this.seasonDuration = seasonDuration;         // Duration + Season of the job
        this.url = url;                               // Link to the original posting
        this.extra = extra;                           // Extra information (department, description, etc.)
    }

    toObject() {
        return {
            name: this.name,
            company: this.company,
            postDate: this.postDate,
            scrapeDate: this.scrapeDate,
            uniqueIdentifier: this.uniqueIdentifier,
            location: this.location,
            seasonDuration: this.seasonDuration,
            url: this.url,
            extra: this.extra
        };
    }
}

class Scraper {
    constructor(name) {
        this.name = name;
    }

    async scrape() {
        throw new Error('Method scrape() must be implemented by derived classes');
    }

    generateUniqueIdentifier(job) {
        // Create a unique string based on job properties
        return `${job.company}-${job.name}-${job.location}`.replace(/\s+/g, '-').toLowerCase();
    }

    formatDate(dateString) {
        try {
            const date = new Date(dateString);
            return date;
        } catch (error) {
            console.error(`Error parsing date: ${dateString}`, error);
            return new Date();
        }
    }
}

class JaneStreetScraper extends Scraper {
    constructor() {
        super('Jane Street');
        this.baseUrl = 'https://www.janestreet.com';
        this.jobsUrl = 'https://www.janestreet.com/join-jane-street/open-roles/?type=internship&location=all-locations&department=all-departments&duration=all-durations';
    }

    async scrape() {
        console.log(`Starting to scrape ${this.name} jobs...`);
        const jobs = [];
        
        // Launch a headless browser
        const browser = await puppeteer.launch({
            headless: 'new', // Use the new headless mode
            args: ['--no-sandbox', '--disable-setuid-sandbox'] // These make it work in more environments
        });

        try {
            const page = await browser.newPage();
            
            // Navigate to the jobs page
            console.log(`Navigating to ${this.jobsUrl}`);
            await page.goto(this.jobsUrl, { waitUntil: 'networkidle2' });
            
            // Wait for job listings to load
            await page.waitForSelector('.students-and-new-grads.job.open');
            
            // Extract job listings
            const jobListings = await page.evaluate(() => {
                const listings = [];
                const jobElements = document.querySelectorAll('a[href^="/join-jane-street/position/"]');
                
                jobElements.forEach((element) => {
                    const positionId = element.getAttribute('href').match(/\/position\/(\d+)/)[1];
                    const jobDiv = element.querySelector('.students-and-new-grads.job.open');
                    
                    if (jobDiv) {
                        const title = jobDiv.querySelector('.position p')?.textContent.trim() || '';
                        const type = jobDiv.querySelector('.type p')?.textContent.trim() || '';
                        const location = jobDiv.querySelector('.city p')?.textContent.trim() || '';
                        const department = jobDiv.querySelector('.department p')?.textContent.trim() || '';
                        const duration = jobDiv.querySelector('.duration p')?.textContent.trim() || '';
                        
                        listings.push({
                            positionId,
                            title,
                            type,
                            location,
                            department,
                            duration,
                            url: element.getAttribute('href')
                        });
                    }
                });
                
                return listings;
            });
            
            console.log(`Found ${jobListings.length} job listings`);
            
            for (const listing of jobListings) {
                const fullUrl = `${this.baseUrl}${listing.url}`;
                
                const job = new JobPosting({
                    name: listing.title,
                    company: 'Jane Street',
                    // No postDate available from the listing page
                    uniqueIdentifier: `jane-street-${listing.positionId}`,
                    location: listing.location,
                    seasonDuration: listing.duration,
                    url: fullUrl,
                    extra: {
                        type: listing.type,
                        department: listing.department,
                        positionId: listing.positionId
                    }
                });
                
                jobs.push(job);
            }
            
            console.log(`Successfully processed ${jobs.length} jobs from ${this.name}`);
            
        } catch (error) {
            console.error(`Error scraping ${this.name}:`, error);
        } finally {
            await browser.close();
        }
        
        return jobs;
    }
}

class CitadelScraper extends Scraper {
    constructor() {
        super('Citadel');
        this.baseUrl = 'https://www.citadel.com';
        this.jobsUrl = 'https://www.citadel.com/careers/open-opportunities/students/internships/';
    }

    async scrape() {
        console.log(`Starting to scrape ${this.name} jobs...`);
        const jobs = [];
        
        // Launch a headless browser
        const browser = await puppeteer.launch({
            headless: 'new',
            args: ['--no-sandbox', '--disable-setuid-sandbox']
        });

        try {
            const page = await browser.newPage();
            
            // Navigate to the jobs page
            console.log(`Navigating to ${this.jobsUrl}`);
            await page.goto(this.jobsUrl, { waitUntil: 'networkidle2' });
            
            // Wait for job listings to load
            await page.waitForSelector('.careers-listing-card');
            
            // Extract job listings
            const jobListings = await page.evaluate(() => {
                const listings = [];
                const jobElements = document.querySelectorAll('a.careers-listing-card.js-career-card');
                
                jobElements.forEach((element) => {
                    const url = element.getAttribute('href');
                    // Extract the position ID from the URL path
                    const positionId = url.split('/').filter(Boolean).pop();
                    
                    const title = element.querySelector('.careers-listing-card__title h2')?.textContent.trim() || '';
                    const location = element.querySelector('.careers-listing-card__location')?.textContent.trim() || '';
                    
                    listings.push({
                        positionId,
                        title,
                        location,
                        url
                    });
                });
                
                return listings;
            });
            
            console.log(`Found ${jobListings.length} job listings`);
            
            // Convert to JobPosting objects
            for (const listing of jobListings) {
                const fullUrl = listing.url.startsWith('http') ? listing.url : `${this.baseUrl}${listing.url}`;
                
                // Extract season/duration from the job title if possible
                let seasonDuration = "Not specified";
                // Look for year patterns like "2025" in the title
                const yearMatch = listing.title.match(/\b(20\d{2})\b/);
                if (yearMatch) {
                    seasonDuration = yearMatch[1];
                }
                
                // Create a unique identifier
                const uniqueId = `citadel-${listing.positionId || this.generateSimpleId(listing.title, listing.location)}`;
                
                // Create a JobPosting object
                const job = new JobPosting({
                    name: listing.title,
                    company: 'Citadel',
                    // No postDate available from the listing page
                    uniqueIdentifier: uniqueId,
                    location: listing.location,
                    seasonDuration: seasonDuration,
                    url: fullUrl,
                    extra: {
                        type: 'Internship', // Since we're only scraping the internships page
                        positionId: listing.positionId
                    }
                });
                
                jobs.push(job);
            }
            
            console.log(`Successfully processed ${jobs.length} jobs from ${this.name}`);
            
        } catch (error) {
            console.error(`Error scraping ${this.name}:`, error);
        } finally {
            await browser.close();
        }
        
        return jobs;
    }
    
    // Helper method to generate a simple ID when no position ID is available
    generateSimpleId(title, location) {
        const cleanTitle = title.replace(/[^\w\s]/gi, '').replace(/\s+/g, '-').toLowerCase();
        const cleanLocation = location.replace(/[^\w\s]/gi, '').replace(/\s+/g, '-').toLowerCase();
        return `${cleanTitle}-${cleanLocation}`;
    }
}

module.exports = {
    JobPosting,
    Scraper,
    JaneStreetScraper,
    CitadelScraper
};