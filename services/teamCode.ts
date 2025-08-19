import { db } from '../config/firebase';

export interface TeamCodeValidationResult {
  isValid: boolean;
  teamName?: string;
  error?: string;
}

/**
 * Validates a team code by checking if it exists in the referralCodes collection
 * @param teamCode - The team code to validate
 * @returns Promise with validation result
 */
export async function validateTeamCode(teamCode: string): Promise<TeamCodeValidationResult> {
  try {
    if (!teamCode || !teamCode.trim()) {
      return {
        isValid: false,
        error: 'Team code is required'
      };
    }

    const cleanedCode = teamCode.trim().toUpperCase();
    
    // Check if the team code exists in the referralCodes collection
    const teamDoc = await db.collection('referralCodes').doc(cleanedCode).get();
    
    if (!teamDoc.exists) {
      return {
        isValid: false,
        error: 'Team code not found. Please check with your coach for the correct code.'
      };
    }

    const teamData = teamDoc.data();
    
    // Check if the team is active
    if (!teamData?.active && !teamData?.ACTIVE) {
      return {
        isValid: false,
        error: 'This team code is no longer active. Please contact your coach.'
      };
    }

    return {
      isValid: true,
      teamName: teamData.name || teamData.INFLUENCER || 'Team',
    };

  } catch (error) {
    console.error('Team code validation error:', error);
    return {
      isValid: false,
      error: 'Unable to validate team code. Please check your internet connection and try again.'
    };
  }
}

/**
 * Creates a success message for a validated team code
 * @param teamName - The name of the team
 * @returns Formatted success message
 */
export function createTeamCodeSuccessMessage(teamName: string): string {
  return `Successfully joined "${teamName}"!`;
}
