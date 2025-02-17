
const fs = require("fs/promises");
const path = require("path");
const { toSystemPath } = require("../../../lib/core/path");
const ioredis = require("ioredis");

// Initialize a global Redis client if it doesn't exist
let redis;

if (process.env.REDIS_HOST) {
  redis = new ioredis({
    port: process.env.REDIS_PORT || 6379,
    host: process.env.REDIS_HOST,
    db: process.env.REDIS_DB || 0,
    password: process.env.REDIS_PASSWORD || undefined,
    username: process.env.REDIS_USER || undefined,
    tls: process.env.REDIS_TLS || undefined,
  });
} else {
  redis = global.redisClient;
}

exports.redis_query = async function (options) {
  try {
    if (!redis) {
      throw new Error('Redis client is not available.');
    }
    const key = this.parse(options.key); 
    if (!key) {
      throw new Error('Invalid key provided.');
    }
    const output = await redis.get(key);
    if (typeof output === 'string') {
      const parsedOutput = JSON.parse(output);
      return parsedOutput;
    }
    return output;
  } catch (error) {
    console.log('Redis query error:', error);
    throw error;
  }
};


exports.redis_ping = async function (options) {
  const timeout = this.parse(options.timeout) || 5000; // Default timeout: 5 seconds
  if (!redis) {
    throw new Error('Redis client is not available.');
  }
  const pingPromise = redis.ping();
  try {
    // Wait for the ping operation or timeout, whichever occurs first
    const output = await Promise.race([
      pingPromise,
      new Promise((_, reject) => setTimeout(() => reject(new Error('Redis ping operation timed out.')), timeout))
    ]);

    return output;
  } catch (error) {
    throw error;
  }
};

exports.redis_insert = async function (options) {
  if (!redis) {
      throw new Error('Redis client is not available.');
    }
    const key = this.parse(options.key)
    const data = this.parse(options.data)
    if (!key || !data) {
      throw new Error('Invalid key or data provided.');
    }
  await redis.set(key, JSON.stringify(data), (error, result) => {
      if (error) {
          console.error('Error setting JSON array data:', error);
      }
  });
}
exports.redis_log_insert = async function (options) {
  if (!redis) {
    throw new Error('Redis client is not available.');
  }
    const logData = {
    ts: this.parse(options.timestamp),
    level: this.parse(options.log_level),
    e_event: this.parse(options.event),
    e_id: this.parse(options.id) ? this.parse(options.id) : "",
    e_type: this.parse(options.type),
    uid: this.parse(options.user_id),
    msg: this.parse(options.message),
    domain: this.parse(options.domain),
    sys: this.parse(options.system),
    sess_id: this.parse(options.session_id),
    aux: typeof this.parse(options.context) === 'object' ? this.parse(options.context) : { data: this.parse(options.context) },
  };

  const jsonString = JSON.stringify(logData);
  
  // Push the JSON data onto a Redis list
  await redis.rpush(options.key, jsonString, (error, result) => {
    if (error) {
      console.error('Error pushing data to Redis list:', error);
    }
  });
}
