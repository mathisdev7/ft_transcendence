import { afterAll, beforeAll, describe, expect, it } from "@jest/globals";
import { existsSync, unlinkSync } from "fs";
import { join } from "path";

describe("register endpoint", () => {
  const baseUrl = "http://localhost:3000";
  const testDbPath = join(__dirname, "../database/test_auth.db");

  beforeAll(async () => {
    console.log("starting tests against running server");
    process.env.TEST_DB_PATH = testDbPath;
  });

  afterAll(async () => {
    console.log("tests completed");
    if (existsSync(testDbPath)) {
      unlinkSync(testDbPath);
      console.log("test database deleted");
    }
  });

  it("should register a new user successfully", async () => {
    const response = await fetch(`${baseUrl}/auth/register`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        email: "test@example.com",
        password: "testpassword123",
      }),
    });

    const data = await response.json();

    console.log("registration response status:", response.status);
    console.log("registration response body:", data);

    expect(response.status).toBe(200);
    expect(data).toHaveProperty("userId");
  });

  it("should fail with duplicate email", async () => {
    await fetch(`${baseUrl}/auth/register`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        email: "duplicate@example.com",
        password: "password123",
      }),
    });

    const response = await fetch(`${baseUrl}/auth/register`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        email: "duplicate@example.com",
        password: "anotherpassword",
      }),
    });

    const data = await response.json();

    console.log("duplicate email response status:", response.status);
    console.log("duplicate email response body:", data);

    expect(response.status).toBe(400);
  });

  it("should fail with invalid email format", async () => {
    const response = await fetch(`${baseUrl}/auth/register`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        email: "invalid-email",
        password: "password123",
      }),
    });

    const data = await response.json();

    console.log("invalid email response status:", response.status);
    console.log("invalid email response body:", data);

    expect(response.status).toBe(400);
  });

  it("should fail with missing password", async () => {
    const response = await fetch(`${baseUrl}/auth/register`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        email: "test2@example.com",
      }),
    });

    const data = await response.json();

    console.log("missing password response status:", response.status);
    console.log("missing password response body:", data);

    expect(response.status).toBe(400);
  });

  it("should fail with weak password", async () => {
    const response = await fetch(`${baseUrl}/auth/register`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        email: "test3@example.com",
        password: "123",
      }),
    });

    const data = await response.json();

    console.log("weak password response status:", response.status);
    console.log("weak password response body:", data);

    expect(response.status).toBe(400);
  });
});
