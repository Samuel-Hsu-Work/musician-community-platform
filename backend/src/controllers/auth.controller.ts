import { Request, Response } from 'express';
import { authService } from '../services/auth.service';
import {
  USERNAME_TOO_SIMILAR_ERROR,
  USERNAME_HELD_ERROR,
} from '../utils/usernameAvailability';

// Register controller - handles user registration
export const register = async (req: Request, res: Response) => {
  try {
    // Step 1: Get data from request body
    const { username, email, password, timezone } = req.body;

    // Step 2: Validate input (basic validation)
    if (!username || !email || !password) {
      return res.status(400).json({ 
        error: 'Username, email, and password are required' 
      });
    }

    // Step 3: Call service to register user
    const result = await authService.register(
      username,
      email,
      password,
      typeof timezone === 'string' ? timezone : undefined
    );

    // Step 4: Send success response
    res.status(201).json({
      message: 'User registered successfully',
      user: result.user,
      token: result.token,
    });
  } catch (error: any) {
    if (error.message === 'This email is already registered') {
      return res.status(409).json({ error: error.message, field: 'email' });
    }

    if (error.message === 'This username is already taken') {
      return res.status(409).json({ error: error.message, field: 'username' });
    }

    if (error.message === USERNAME_TOO_SIMILAR_ERROR) {
      return res.status(409).json({ error: error.message, field: 'username' });
    }

    if (error.message === USERNAME_HELD_ERROR) {
      return res.status(409).json({ error: error.message, field: 'username' });
    }

    const validationErrors = [
      'Username is required',
      'This username is reserved',
      'Email is required',
      'Email is too long',
      'Please enter a valid email address (e.g. name@example.com)',
      'Password is required',
      'Password is too long (max 128 characters)',
      'Password must contain at least one letter and one number',
    ];

    if (
      error.message.includes('Username must be') ||
      error.message.includes('Password must be at least') ||
      validationErrors.includes(error.message)
    ) {
      return res.status(400).json({ error: error.message });
    }

    console.error('Register error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const checkRegisterAvailability = async (req: Request, res: Response) => {
  try {
    const { username, email } = req.body;

    if (username === undefined && email === undefined) {
      return res.status(400).json({
        error: 'Provide username and/or email to check',
      });
    }

    const result = await authService.checkRegisterAvailability(username, email);

    return res.status(200).json({ success: true, ...result });
  } catch (error: any) {
    console.error('Check availability error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Login controller - handles user login
export const login = async (req: Request, res: Response) => {
  try {
    // Step 1: Get data from request body
    const { username, password } = req.body;

    if (
      typeof username !== 'string' ||
      typeof password !== 'string' ||
      !username.trim() ||
      !password
    ) {
      return res.status(400).json({
        error: 'Username or email and password are required',
      });
    }

    const result = await authService.login(username, password);

    // Step 4: Send success response
    res.status(200).json({
      message: 'Login successful',
      user: result.user,
      token: result.token,
    });
  } catch (error: any) {
    if (
      error.message === 'Username or email is required' ||
      error.message === 'Password is required' ||
      error.message.includes('Password must be') ||
      error.message.includes('Password must contain') ||
      error.message === 'Password is too long (max 128 characters)' ||
      error.message.includes('Username must be') ||
      error.message.includes('valid email') ||
      error.message === 'Email is too long' ||
      error.message === 'This username is reserved'
    ) {
      return res.status(400).json({ error: error.message });
    }

    if (error.message === 'Invalid credentials') {
      return res.status(401).json({ error: error.message });
    }
    
    console.error('Login error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Logout controller - handles user logout
// Note: With JWT, logout is usually handled on the client side
// (client just removes the token). But we can provide this endpoint
// for consistency or future token blacklisting.
export const logout = async (req: Request, res: Response) => {
  // Since we're using JWT (stateless), logout is typically handled client-side
  // by removing the token. This endpoint can be used for logging purposes
  // or future token blacklisting if needed.
  
  res.status(200).json({ 
    message: 'Logout successful' 
  });
};
