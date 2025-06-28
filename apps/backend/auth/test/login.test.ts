import { afterAll, beforeAll, describe, expect, it } from "@jest/globals";
import { existsSync, unlinkSync } from "fs";
import { join } from "path";

describe("login endpoint", () => {
  const baseUrl = "http://localhost:3000";
  const testDbPath = join(__dirname, "../database/test_auth.db");

  beforeAll(async () => {
    console.log("starting login tests against running server");
    process.env.TEST_DB_PATH = testDbPath;
  });

  afterAll(async () => {
    console.log("login tests completed");
    if (existsSync(testDbPath)) {
      unlinkSync(testDbPath);
      console.log("test database deleted");
    }
  });

  it("should login with valid credentials", async () => {
    const timestamp = Date.now();
    const testEmail = `logintest-${timestamp}@example.com`;

    await fetch(`${baseUrl}/auth/register`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        email: testEmail,
        password: "testpassword123",
      }),
    });

    const response = await fetch(`${baseUrl}/auth/login`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        email: testEmail,
        password: "testpassword123",
      }),
    });

    const data = await response.json();

    console.log("valid login response status:", response.status);
    console.log("valid login response body:", data);

    expect(response.status).toBe(200);
    expect(data).toHaveProperty("accessToken");
    expect(data).toHaveProperty("user");
    expect(data.user).toHaveProperty("email", testEmail);
  });

  it("should fail with invalid email", async () => {
    const timestamp = Date.now();
    const response = await fetch(`${baseUrl}/auth/login`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        email: `nonexistent-${timestamp}@example.com`,
        password: "testpassword123",
      }),
    });

    const data = await response.json();

    console.log("invalid email login response status:", response.status);
    console.log("invalid email login response body:", data);

    expect(response.status).toBe(401);
    expect(data).toHaveProperty("error", "invalid credentials");
  });

  it("should fail with wrong password", async () => {
    const timestamp = Date.now();
    const testEmail = `wrongpass-${timestamp}@example.com`;

    await fetch(`${baseUrl}/auth/register`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        email: testEmail,
        password: "correctpassword123",
      }),
    });

    const response = await fetch(`${baseUrl}/auth/login`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        email: testEmail,
        password: "wrongpassword",
      }),
    });

    const data = await response.json();

    console.log("wrong password login response status:", response.status);
    console.log("wrong password login response body:", data);

    expect(response.status).toBe(401);
    expect(data).toHaveProperty("error", "invalid credentials");
  });

  it("should fail with invalid email format", async () => {
    const response = await fetch(`${baseUrl}/auth/login`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        email: "invalid-email",
        password: "testpassword123",
      }),
    });

    const data = await response.json();

    console.log("invalid format login response status:", response.status);
    console.log("invalid format login response body:", data);

    expect(response.status).toBe(400);
    expect(data).toHaveProperty("error", "Bad Request");
  });

  it("should fail with missing password", async () => {
    const timestamp = Date.now();
    const response = await fetch(`${baseUrl}/auth/login`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        email: `missing-pass-${timestamp}@example.com`,
      }),
    });

    const data = await response.json();

    console.log("missing password login response status:", response.status);
    console.log("missing password login response body:", data);

    expect(response.status).toBe(400);
    expect(data).toHaveProperty("error", "Bad Request");
  });

  it("should set refresh token cookie on successful login", async () => {
    const timestamp = Date.now();
    const testEmail = `cookie-test-${timestamp}@example.com`;

    await fetch(`${baseUrl}/auth/register`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        email: testEmail,
        password: "testpassword123",
      }),
    });

    const response = await fetch(`${baseUrl}/auth/login`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        email: testEmail,
        password: "testpassword123",
      }),
    });

    const cookies = response.headers.get("set-cookie");

    console.log("cookie login response status:", response.status);
    console.log("cookie login response cookies:", cookies);

    expect(response.status).toBe(200);
    expect(cookies).toContain("refreshToken");
    expect(cookies).toContain("HttpOnly");
  });
});
