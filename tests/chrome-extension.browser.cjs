// Run the same real-browser fixture without exposing the test-only game API.
process.env.ASADERO_TEST_EXTENSION = '1';
require('./game.browser.cjs');
