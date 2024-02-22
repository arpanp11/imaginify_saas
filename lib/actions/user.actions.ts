'use server';

import { revalidatePath } from 'next/cache';

import User from '../database/models/user.model';
import { connectToDatabase } from '../database/mongoose';
import { handleError } from '../utils';

/**
 * Creates a new user in the database.
 *
 * Connects to the database, creates a new user document from the provided
 * user parameters, and returns the new user object.
 *
 * Handles any errors from the database operations.
 */
export async function createUser(user: CreateUserParams) {
  try {
    await connectToDatabase();

    const newUser = await User.create(user);

    return JSON.parse(JSON.stringify(newUser));
  } catch (error) {
    handleError(error);
  }
}

/**
 * Gets a user by ID from the database.
 *
 * Connects to the database, queries for the user with the given ID, and returns the user object.
 *
 * Throws an error if no user is found with the given ID.
 *
 * Handles any errors from the database operations.
 */
export async function getUserById(userId: string) {
  try {
    await connectToDatabase();

    const user = await User.findOne({ clerkId: userId });

    if (!user) throw new Error('User not found');

    return JSON.parse(JSON.stringify(user));
  } catch (error) {
    handleError(error);
  }
}

/**
 * Updates a user in the database by clerkId.
 *
 * Connects to the database, finds the user with the given clerkId,
 * updates the user document with the provided user parameters,
 * and returns the updated user object.
 *
 * Throws an error if no user is found for the given clerkId.
 *
 * Handles any errors from the database operations.
 */
export async function updateUser(clerkId: string, user: UpdateUserParams) {
  try {
    await connectToDatabase();

    const updatedUser = await User.findOneAndUpdate({ clerkId }, user, {
      new: true,
    });

    if (!updatedUser) throw new Error('User update failed');

    return JSON.parse(JSON.stringify(updatedUser));
  } catch (error) {
    handleError(error);
  }
}

/**
 * Deletes a user from the database by clerkId.
 *
 * Connects to the database, finds the user with the given clerkId,
 * deletes the user document, and returns the deleted user object.
 *
 * Throws an error if no user is found for the given clerkId.
 *
 * Handles any errors from the database operations.
 */
export async function deleteUser(clerkId: string) {
  try {
    await connectToDatabase();

    // Find user to delete
    const userToDelete = await User.findOne({ clerkId });

    if (!userToDelete) {
      throw new Error('User not found');
    }

    // Delete user
    const deletedUser = await User.findByIdAndDelete(userToDelete._id);
    revalidatePath('/');

    return deletedUser ? JSON.parse(JSON.stringify(deletedUser)) : null;
  } catch (error) {
    handleError(error);
  }
}

/**
 * Updates the credit balance for the user with the given ID.
 *
 * Connects to the database, finds the user by ID, increments their
 * credit balance by the provided amount, and returns the updated user object.
 *
 * Throws an error if the user update fails.
 *
 * Handles any errors from the database operations.
 */
export async function updateCredits(userId: string, creditFee: number) {
  try {
    await connectToDatabase();

    const updatedUserCredits = await User.findOneAndUpdate(
      { _id: userId },
      { $inc: { creditBalance: creditFee } },
      { new: true }
    );

    if (!updatedUserCredits) throw new Error('User credits update failed');

    return JSON.parse(JSON.stringify(updatedUserCredits));
  } catch (error) {
    handleError(error);
  }
}
