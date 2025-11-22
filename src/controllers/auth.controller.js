import logger from '#config/logger.js';
import { signupSchema, signinSchema } from '#validations/auth.validation.js';
import { formatValidationError } from '#utils/format.js';
import { createUser, authenticateUser } from '#services/auth.service.js';
import { jwtToken } from '#utils/jwt.js';
import { cookies } from '#utils/cookies.js';

export const signup = async (req, res, next) => {
  try {
    const validationResult = signupSchema.safeParse(req.body);

    if (!validationResult.success) {
      return res.status(400).json({
        error: 'Validation failed',
        details: formatValidationError(validationResult.error),
      });
    }

    const { name, email, role, password } = validationResult.data;

    // AUTH SERVICE
    const user = await createUser({ name, email, password, role });

    const token = jwtToken.sign({
      id: user.id,
      email: user.email,
      role: user.role,
    });

    cookies.set(res, 'user', token);

    logger.info(`User signed up: ${email} with role: ${role}`);

    return res.status(201).json({
      message: 'User signed up successfully',
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    });
  } catch (e) {
    logger.error('Signup error: ', e);

    if (e.message == 'User with this email already exists') {
      return res.status(409).json({ message: e.message });
    }

    next(e);
  }
};

export const signin = async (req, res, next) => {
  try {
    const validationResult = signinSchema.safeParse(req.body);

    if (!validationResult.success) {
      return res.status(400).json({
        error: 'Validation failed',
        details: formatValidationError(validationResult.error),
      });
    }

    const { email, password } = validationResult.data;

    // AUTH SERVICE
    const user = await authenticateUser({ email, password });

    const token = jwtToken.sign({
      id: user.id,
      email: user.email,
      role: user.role,
    });

    cookies.set(res, 'user', token);

    logger.info(`User signed in: ${email}`);

    return res.status(200).json({
      message: 'User signed in successfully',
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    });
  } catch (e) {
    logger.error('Signin error: ', e);

    if (e.message === 'User not found' || e.message === 'Invalid password') {
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    next(e);
  }
};

export const signout = async (req, res, next) => {
  try {
    cookies.clear(res, 'user');

    logger.info('User signed out');

    return res.status(200).json({
      message: 'User signed out successfully',
    });
  } catch (e) {
    logger.error('Signout error: ', e);
    next(e);
  }
};
