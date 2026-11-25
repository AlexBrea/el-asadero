/** Wake the simulation while the browser suspends animation frames in hidden tabs. */
self.setInterval(() => self.postMessage(null), 100);
