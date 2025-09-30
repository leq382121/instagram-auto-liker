#!/usr/bin/env node
/**
 * Instagram Auto Liker Bot
 * Automatically logs into Instagram and likes posts from specified hashtags
 * Designed to simulate human behavior with randomized delays
 *
 * @author Senior Developer
 * @version 2.0.0
 */

const puppeteer = require("puppeteer-core");
const dotenv = require("dotenv");

// Load environment variables
dotenv.config();

// ============================================================================
// CONSTANTS AND CONFIGURATION
// ============================================================================

const Config = {
  // User credentials
  USERNAME: process.env.INSTAGRAM_USERNAME,
  PASSWORD: process.env.INSTAGRAM_PASSWORD,

  // Hashtag configuration
  HASHTAGS: process.env.INSTAGRAM_HASHTAGS
    ? JSON.parse(process.env.INSTAGRAM_HASHTAGS)
    : ["photography"],
  POSTS_PER_HASHTAG: parseInt(process.env.POSTS_PER_HASHTAG) || 9,

  // Timing configuration (in milliseconds)
  CYCLE_INTERVAL: 180000, // 3 minutes
  POST_LOAD_DELAY: 2000,
  NAVIGATION_DELAY: 3000,
  BETWEEN_LIKES_DELAY: 2000,
  HASHTAG_PAUSE_BASE: 10000, // 10 seconds
  HASHTAG_PAUSE_RANDOM: 2000, // +0-2 seconds

  // Browser configuration
  CHROME_PATH: process.env.CHROME_PATH ||
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  USER_AGENT: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",

  // Login configuration
  MAX_LOGIN_ATTEMPTS: 3,
  LOGIN_RETRY_DELAY: 3000,
  POPUP_TIMEOUT: 5000,
};

// DOM Selectors
const Selectors = {
  USERNAME_INPUT: 'input[name="username"]',
  PASSWORD_INPUT: 'input[name="password"]',
  SUBMIT_BUTTON: 'button[type="submit"]',
  BUTTON: "button",
  TAB: 'a[role="tab"]',
  POST_LINK: 'a[href*="/p/"]',
  PRESENTATION: 'div[role="presentation"]',
  SECTION: "section",
  LIKE_BUTTON: 'svg[aria-label="Like"]',
  UNLIKE_BUTTON: 'svg[aria-label="Unlike"]',
  LIKE_OR_UNLIKE: 'section svg[aria-label="Like"], section svg[aria-label="Unlike"]',
};

// Action result constants
const LikeResult = {
  LIKED: "liked",
  ALREADY_LIKED: "already_liked",
  FAILED: "failed",
};

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Creates a delay promise
 * @param {number} milliseconds - Time to wait in milliseconds
 * @returns {Promise<void>}
 */
const delay = (milliseconds) =>
  new Promise((resolve) => setTimeout(resolve, milliseconds));

/**
 * Generates a random delay time within a range
 * @param {number} baseTime - Base time in milliseconds
 * @param {number} randomRange - Random additional time in milliseconds
 * @returns {number} Random time within range
 */
const randomDelay = (baseTime, randomRange) =>
  baseTime + Math.floor(Math.random() * randomRange);

/**
 * Formats time from milliseconds to seconds with one decimal
 * @param {number} milliseconds - Time in milliseconds
 * @returns {string} Formatted time string
 */
const formatSeconds = (milliseconds) =>
  (milliseconds / 1000).toFixed(1);

/**
 * Logs a section header for better console readability
 * @param {string} text - Header text
 */
const logHeader = (text) => {
  console.log("\n" + "=".repeat(60));
  console.log(text);
  console.log("=".repeat(60));
};

/**
 * Logs a subsection for better console readability
 * @param {string} text - Subsection text
 */
const logSubsection = (text) => {
  console.log(`\n${text}`);
};

// ============================================================================
// INSTAGRAM AUTO LIKER CLASS
// ============================================================================

class InstagramAutoLiker {
  constructor() {
    this.browser = null;
    this.page = null;
  }

  // ==========================================================================
  // BROWSER SETUP
  // ==========================================================================

  /**
   * Initializes and launches the browser with anti-detection settings
   * @returns {Promise<void>}
   */
  async startBrowser() {
    console.log("Starting browser...");

    this.browser = await puppeteer.launch({
      executablePath: Config.CHROME_PATH,
      headless: false,
      args: [
        "--no-sandbox",
        "--disable-setuid-sandbox",
        "--disable-blink-features=AutomationControlled",
      ],
      defaultViewport: {
        width: 1280,
        height: 800,
      },
    });

    this.page = await this.browser.newPage();
    await this.page.setUserAgent(Config.USER_AGENT);
  }

  // ==========================================================================
  // LOGIN FLOW
  // ==========================================================================

  /**
   * Attempts to log in to Instagram with retry logic
   * @returns {Promise<void>}
   * @throws {Error} If login fails after max attempts
   */
  async login() {
    let attemptNumber = 0;

    while (attemptNumber < Config.MAX_LOGIN_ATTEMPTS) {
      attemptNumber++;
      console.log(`Login attempt ${attemptNumber}/${Config.MAX_LOGIN_ATTEMPTS}...`);

      await this.navigateToLoginPage();
      await this.acceptCookiesIfPresent();
      await this.enterCredentials();
      await this.submitLoginForm();

      const loginSuccessful = await this.waitForLoginResult();

      if (!loginSuccessful && attemptNumber < Config.MAX_LOGIN_ATTEMPTS) {
        await this.retryLogin();
        continue;
      }

      if (!loginSuccessful) {
        throw new Error(
          "Login failed after multiple attempts. Please check your credentials or try logging in manually."
        );
      }

      await this.dismissPostLoginPopups();
      console.log("✓ Successfully logged in!");
      break;
    }
  }

  /**
   * Navigates to Instagram login page
   * @returns {Promise<void>}
   */
  async navigateToLoginPage() {
    console.log("Navigating to Instagram login...");
    await this.page.goto("https://www.instagram.com/accounts/login/", {
      waitUntil: "networkidle2",
    });
  }

  /**
   * Accepts cookie consent banner if present
   * @returns {Promise<void>}
   */
  async acceptCookiesIfPresent() {
    try {
      await this.page.waitForSelector(Selectors.BUTTON, {
        timeout: Config.POPUP_TIMEOUT
      });

      const cookieButtons = await this.page.$$(Selectors.BUTTON);

      for (const button of cookieButtons) {
        const buttonText = await this.getElementText(button);

        if (this.isAcceptCookieButton(buttonText)) {
          await button.click();
          console.log("Accepted cookies");
          await delay(Config.POST_LOAD_DELAY);
          break;
        }
      }
    } catch (error) {
      console.log("No cookie banner found");
    }
  }

  /**
   * Checks if button text indicates cookie acceptance
   * @param {string} text - Button text
   * @returns {boolean}
   */
  isAcceptCookieButton(text) {
    return text.includes("Allow") || text.includes("Accept");
  }

  /**
   * Enters username and password into login form
   * @returns {Promise<void>}
   */
  async enterCredentials() {
    console.log("Entering credentials...");

    await this.page.waitForSelector(Selectors.USERNAME_INPUT);

    // Enter username with human-like typing
    await this.clearAndTypeIntoField(
      Selectors.USERNAME_INPUT,
      Config.USERNAME
    );
    await delay(1000);

    // Enter password with human-like typing
    await this.clearAndTypeIntoField(
      Selectors.PASSWORD_INPUT,
      Config.PASSWORD
    );
    await delay(1000);
  }

  /**
   * Clears a form field and types text with human-like delay
   * @param {string} selector - CSS selector for the input field
   * @param {string} text - Text to type
   * @returns {Promise<void>}
   */
  async clearAndTypeIntoField(selector, text) {
    await this.page.click(selector, { clickCount: 3 });
    await this.page.type(selector, text, { delay: 100 });
  }

  /**
   * Submits the login form
   * @returns {Promise<void>}
   */
  async submitLoginForm() {
    await this.page.click(Selectors.SUBMIT_BUTTON);
    console.log("Logging in...");
  }

  /**
   * Waits for login result and checks if successful
   * @returns {Promise<boolean>} True if login successful, false otherwise
   */
  async waitForLoginResult() {
    try {
      await this.page.waitForNavigation({
        waitUntil: "networkidle2",
        timeout: 30000,
      });
      await delay(Config.POST_LOAD_DELAY);
    } catch (error) {
      console.log("Navigation timeout or error:", error.message);
    }

    return !this.isStillOnLoginPage();
  }

  /**
   * Checks if still on login page
   * @returns {boolean}
   */
  isStillOnLoginPage() {
    const currentUrl = this.page.url();
    const stillOnLoginPage = currentUrl.includes("/accounts/login/");

    if (stillOnLoginPage) {
      console.log("⚠ Still on login page, login may have failed or page refreshed");
    }

    return stillOnLoginPage;
  }

  /**
   * Waits before retrying login
   * @returns {Promise<void>}
   */
  async retryLogin() {
    console.log("Retrying login in 3 seconds...");
    await delay(Config.LOGIN_RETRY_DELAY);
  }

  /**
   * Dismisses post-login popups (save login info, notifications)
   * @returns {Promise<void>}
   */
  async dismissPostLoginPopups() {
    await this.dismissPopupByButtonText(
      ["Not now", "Not Now"],
      "save login info"
    );

    await this.dismissPopupByButtonText(
      ["Not Now", "Not now"],
      "notifications"
    );
  }

  /**
   * Generic function to dismiss popups by finding button with specific text
   * @param {string[]} buttonTexts - Array of possible button texts
   * @param {string} popupName - Name of popup for logging
   * @returns {Promise<void>}
   */
  async dismissPopupByButtonText(buttonTexts, popupName) {
    try {
      await this.page.waitForSelector(Selectors.BUTTON, {
        timeout: Config.POPUP_TIMEOUT
      });

      const buttons = await this.page.$$(Selectors.BUTTON);

      for (const button of buttons) {
        const buttonText = await this.getElementText(button);

        if (buttonTexts.some(text => buttonText.includes(text))) {
          await button.click();
          console.log(`Dismissed ${popupName} popup`);
          await delay(Config.POST_LOAD_DELAY);
          break;
        }
      }
    } catch (error) {
      console.log(`No ${popupName} popup`);
    }
  }

  /**
   * Gets text content from a DOM element
   * @param {ElementHandle} element - Puppeteer element handle
   * @returns {Promise<string>}
   */
  async getElementText(element) {
    return await this.page.evaluate((el) => el.textContent, element);
  }

  // ==========================================================================
  // NAVIGATION
  // ==========================================================================

  /**
   * Navigates to a specific hashtag page
   * @param {string} hashtag - Hashtag name without # symbol
   * @returns {Promise<void>}
   */
  async navigateToHashtag(hashtag) {
    const hashtagUrl = this.buildHashtagUrl(hashtag);
    console.log(`Navigating to #${hashtag}...`);

    await this.page.goto(hashtagUrl, { waitUntil: "networkidle2" });
    await delay(Config.NAVIGATION_DELAY);
  }

  /**
   * Builds the Instagram hashtag search URL
   * @param {string} hashtag - Hashtag name
   * @returns {string} Full URL
   */
  buildHashtagUrl(hashtag) {
    return `https://www.instagram.com/explore/search/keyword/?q=%23${hashtag}`;
  }

  // ==========================================================================
  // POST DISCOVERY
  // ==========================================================================

  /**
   * Retrieves recent post URLs from current hashtag page
   * @returns {Promise<string[]>} Array of post URLs
   */
  async getRecentPosts() {
    try {
      await this.waitForPostsToLoad();
      const postUrls = await this.extractPostUrls();

      console.log(`Found ${postUrls.length} recent posts`);
      return postUrls;
    } catch (error) {
      console.error("Error getting recent posts:", error);
      return [];
    }
  }

  /**
   * Waits for posts to appear on the page
   * @returns {Promise<void>}
   */
  async waitForPostsToLoad() {
    try {
      await this.page.waitForSelector(Selectors.POST_LINK, { timeout: 10000 });
    } catch (error) {
      console.log("Trying alternative selector...");
      await this.page.waitForSelector(Selectors.PRESENTATION, { timeout: 10000 });
    }

    await delay(Config.POST_LOAD_DELAY);
  }

  /**
   * Extracts post URLs from the page
   * @returns {Promise<string[]>}
   */
  async extractPostUrls() {
    return await this.page.evaluate(
      (postLinkSelector, maxPosts) => {
        const links = Array.from(document.querySelectorAll(postLinkSelector));
        return links.slice(0, maxPosts).map((link) => link.href);
      },
      Selectors.POST_LINK,
      Config.POSTS_PER_HASHTAG
    );
  }

  // ==========================================================================
  // POST INTERACTION
  // ==========================================================================

  /**
   * Attempts to like a single post
   * @param {string} postUrl - URL of the post to like
   * @returns {Promise<string>} Result status: liked, already_liked, or failed
   */
  async likePost(postUrl) {
    try {
      await this.navigateToPost(postUrl);
      await this.waitForLikeButton();

      if (await this.isPostAlreadyLiked()) {
        console.log(`  → Already liked: ${postUrl}`);
        return LikeResult.ALREADY_LIKED;
      }

      const clickSuccessful = await this.clickLikeButton();

      if (!clickSuccessful) {
        console.log("  ✗ Could not find or click like button");
        return LikeResult.FAILED;
      }

      console.log(`  ✓ Clicked like button`);
      await delay(Config.POST_LOAD_DELAY);

      if (await this.verifyLikeSuccessful()) {
        console.log(`  ✓ Like verified: ${postUrl}`);
        return LikeResult.LIKED;
      } else {
        console.log(`  ⚠ Like may not have registered: ${postUrl}`);
        return LikeResult.FAILED;
      }
    } catch (error) {
      console.error(`  ✗ Error liking post ${postUrl}:`, error.message);
      return LikeResult.FAILED;
    }
  }

  /**
   * Navigates to a specific post
   * @param {string} postUrl - Post URL
   * @returns {Promise<void>}
   */
  async navigateToPost(postUrl) {
    await this.page.goto(postUrl, { waitUntil: "networkidle2" });
    await delay(Config.POST_LOAD_DELAY);
  }

  /**
   * Waits for like button to appear
   * @returns {Promise<void>}
   */
  async waitForLikeButton() {
    await this.page.waitForSelector(Selectors.LIKE_OR_UNLIKE, {
      timeout: 10000
    });
  }

  /**
   * Checks if post is already liked
   * @returns {Promise<boolean>}
   */
  async isPostAlreadyLiked() {
    return await this.page.evaluate((sectionSelector, unlikeSelector) => {
      const sections = document.querySelectorAll(sectionSelector);

      for (const section of sections) {
        const unlikeSvg = section.querySelector(unlikeSelector);

        // Main like button has height 24 (comment buttons have height 16)
        if (unlikeSvg && unlikeSvg.getAttribute('height') === '24') {
          return true;
        }
      }

      return false;
    }, Selectors.SECTION, Selectors.UNLIKE_BUTTON);
  }

  /**
   * Finds and clicks the main like button
   * @returns {Promise<boolean>} True if clicked successfully
   */
  async clickLikeButton() {
    return await this.page.evaluate((sectionSelector, likeSelector) => {
      const sections = document.querySelectorAll(sectionSelector);

      for (const section of sections) {
        const likeSvg = section.querySelector(likeSelector);

        // Main like button has height 24 (not the small comment ones with height 16)
        if (likeSvg && likeSvg.getAttribute('height') === '24') {
          // Traverse up DOM to find clickable parent
          let parent = likeSvg;

          while (parent && parent !== document.body) {
            const isClickable =
              parent.getAttribute('role') === 'button' &&
              parent.getAttribute('tabindex') === '0';

            if (isClickable) {
              parent.click();
              return true;
            }

            parent = parent.parentElement;
          }
        }
      }

      return false;
    }, Selectors.SECTION, Selectors.LIKE_BUTTON);
  }

  /**
   * Verifies that the like action was successful
   * @returns {Promise<boolean>}
   */
  async verifyLikeSuccessful() {
    return await this.page.evaluate((sectionSelector, unlikeSelector) => {
      const sections = document.querySelectorAll(sectionSelector);

      for (const section of sections) {
        const unlikeSvg = section.querySelector(unlikeSelector);

        if (unlikeSvg && unlikeSvg.getAttribute('height') === '24') {
          return true;
        }
      }

      return false;
    }, Selectors.SECTION, Selectors.UNLIKE_BUTTON);
  }

  // ==========================================================================
  // LIKE CYCLE ORCHESTRATION
  // ==========================================================================

  /**
   * Executes a complete like cycle across all configured hashtags
   * @returns {Promise<void>}
   */
  async likeRecentPosts() {
    logHeader(`Starting like cycle at ${new Date().toLocaleString()}`);

    const statistics = this.createStatisticsTracker();

    for (let hashtagIndex = 0; hashtagIndex < Config.HASHTAGS.length; hashtagIndex++) {
      const hashtag = Config.HASHTAGS[hashtagIndex];

      await this.processHashtag(hashtag, hashtagIndex, statistics);
      await this.pauseBetweenHashtags(hashtagIndex);
    }

    this.displayTotalStatistics(statistics);
  }

  /**
   * Creates statistics tracker object
   * @returns {Object} Statistics object
   */
  createStatisticsTracker() {
    return {
      totalLiked: 0,
      totalAlreadyLiked: 0,
      totalFailed: 0,
    };
  }

  /**
   * Processes all posts for a single hashtag
   * @param {string} hashtag - Hashtag to process
   * @param {number} index - Current hashtag index
   * @param {Object} statistics - Statistics tracker
   * @returns {Promise<void>}
   */
  async processHashtag(hashtag, index, statistics) {
    logSubsection(`[${index + 1}/${Config.HASHTAGS.length}] Processing #${hashtag}...`);

    await this.navigateToHashtag(hashtag);
    const postUrls = await this.getRecentPosts();

    if (postUrls.length === 0) {
      console.log(`No posts found for #${hashtag}!`);
      return;
    }

    const hashtagStats = await this.likePostsFromHashtag(postUrls);
    this.displayHashtagStatistics(hashtag, hashtagStats);
    this.updateTotalStatistics(statistics, hashtagStats);
  }

  /**
   * Likes all posts from a hashtag and tracks results
   * @param {string[]} postUrls - Array of post URLs
   * @returns {Promise<Object>} Hashtag statistics
   */
  async likePostsFromHashtag(postUrls) {
    const stats = { liked: 0, alreadyLiked: 0, failed: 0 };

    for (let postIndex = 0; postIndex < postUrls.length; postIndex++) {
      console.log(`  Post ${postIndex + 1}/${postUrls.length}: `);

      const result = await this.likePost(postUrls[postIndex]);
      this.updateHashtagStats(stats, result);

      await delay(Config.BETWEEN_LIKES_DELAY);
    }

    return stats;
  }

  /**
   * Updates hashtag statistics based on like result
   * @param {Object} stats - Statistics object
   * @param {string} result - Like result status
   */
  updateHashtagStats(stats, result) {
    if (result === LikeResult.LIKED) {
      stats.liked++;
    } else if (result === LikeResult.ALREADY_LIKED) {
      stats.alreadyLiked++;
    } else {
      stats.failed++;
    }
  }

  /**
   * Displays statistics for a single hashtag
   * @param {string} hashtag - Hashtag name
   * @param {Object} stats - Hashtag statistics
   */
  displayHashtagStatistics(hashtag, stats) {
    console.log(
      `\n  #${hashtag}: ✓ ${stats.liked} liked, ` +
      `→ ${stats.alreadyLiked} already liked, ` +
      `✗ ${stats.failed} failed`
    );
  }

  /**
   * Updates total statistics with hashtag results
   * @param {Object} totalStats - Total statistics object
   * @param {Object} hashtagStats - Hashtag statistics object
   */
  updateTotalStatistics(totalStats, hashtagStats) {
    totalStats.totalLiked += hashtagStats.liked;
    totalStats.totalAlreadyLiked += hashtagStats.alreadyLiked;
    totalStats.totalFailed += hashtagStats.failed;
  }

  /**
   * Pauses between hashtags with randomized delay
   * @param {number} currentIndex - Current hashtag index
   * @returns {Promise<void>}
   */
  async pauseBetweenHashtags(currentIndex) {
    const isLastHashtag = currentIndex === Config.HASHTAGS.length - 1;

    if (!isLastHashtag) {
      const pauseTime = randomDelay(
        Config.HASHTAG_PAUSE_BASE,
        Config.HASHTAG_PAUSE_RANDOM
      );

      console.log(`  Pausing for ${formatSeconds(pauseTime)}s before next hashtag...`);
      await delay(pauseTime);
    }
  }

  /**
   * Displays total statistics for the like cycle
   * @param {Object} statistics - Total statistics object
   */
  displayTotalStatistics(statistics) {
    logHeader(
      `TOTAL: ✓ ${statistics.totalLiked} liked, ` +
      `→ ${statistics.totalAlreadyLiked} already liked, ` +
      `✗ ${statistics.totalFailed} failed`
    );
  }

  // ==========================================================================
  // MAIN RUN LOOP
  // ==========================================================================

  /**
   * Main execution loop - runs continuously until stopped
   * @returns {Promise<void>}
   */
  async run() {
    try {
      await this.startBrowser();
      await this.login();

      await this.executeInfiniteLikeCycle();
    } catch (error) {
      console.error("Fatal error:", error);
    } finally {
      await this.cleanup();
    }
  }

  /**
   * Executes infinite like cycles with error recovery
   * @returns {Promise<void>}
   */
  async executeInfiniteLikeCycle() {
    while (true) {
      try {
        await this.likeRecentPosts();
        await this.waitForNextCycle();
      } catch (error) {
        await this.handleCycleError(error);
      }
    }
  }

  /**
   * Waits for the configured interval before next cycle
   * @returns {Promise<void>}
   */
  async waitForNextCycle() {
    const nextCycleTime = new Date(Date.now() + Config.CYCLE_INTERVAL);

    console.log("Waiting 3 minutes before next cycle...");
    console.log(`Next cycle at: ${nextCycleTime.toLocaleString()}\n`);

    await delay(Config.CYCLE_INTERVAL);
  }

  /**
   * Handles errors during like cycle
   * @param {Error} error - Error object
   * @returns {Promise<void>}
   */
  async handleCycleError(error) {
    console.error("Error during like cycle:", error);
    console.log("Retrying in 30 seconds...");
    await delay(30000);
  }

  /**
   * Cleanup resources
   * @returns {Promise<void>}
   */
  async cleanup() {
    if (this.browser) {
      console.log("Closing browser...");
      await this.browser.close();
    }
  }
}

// ============================================================================
// APPLICATION ENTRY POINT
// ============================================================================

/**
 * Validates environment configuration
 * @throws {Error} If required configuration is missing
 */
function validateConfiguration() {
  if (!Config.USERNAME || !Config.PASSWORD) {
    console.error(
      "Error: INSTAGRAM_USERNAME and INSTAGRAM_PASSWORD must be set in .env file"
    );
    console.log("\nCreate a .env file with:");
    console.log("INSTAGRAM_USERNAME=your_username");
    console.log("INSTAGRAM_PASSWORD=your_password");
    console.log('INSTAGRAM_HASHTAGS=["lithuania","vilnius","kaunas"]');
    console.log('POSTS_PER_HASHTAG=9  # optional, defaults to 9');
    process.exit(1);
  }
}

/**
 * Displays startup banner with configuration
 */
function displayStartupBanner() {
  console.log(`
╔════════════════════════════════════════════════════════════╗
║           Instagram Auto Liker Bot                         ║
╠════════════════════════════════════════════════════════════╣
║  Username:  ${Config.USERNAME.padEnd(44)} ║
║  Hashtags:  ${Config.HASHTAGS.length} hashtags${" ".repeat(44 - String(Config.HASHTAGS.length).length - 9)} ║
║  Posts/tag: ${Config.POSTS_PER_HASHTAG}${" ".repeat(48 - String(Config.POSTS_PER_HASHTAG).length)} ║
║  Interval:  Every 3 minutes                                ║
╚════════════════════════════════════════════════════════════╝
`);
}

/**
 * Sets up graceful shutdown handler
 */
function setupGracefulShutdown() {
  process.on("SIGINT", () => {
    console.log("\n\nStopping bot...");
    process.exit(0);
  });
}

/**
 * Main application entry point
 * @returns {Promise<void>}
 */
async function main() {
  validateConfiguration();
  displayStartupBanner();
  setupGracefulShutdown();

  const bot = new InstagramAutoLiker();
  await bot.run();
}

// Start the application
main();