import { Request, Response } from 'express';
import axios from 'axios';

const AI_SERVICE_URL = process.env.AI_SERVICE_URL || 'http://localhost:8000';

class AIService {
  async getForecast(productId: string, daysAhead: number = 7) {
    try {
      const response = await axios.post(`${AI_SERVICE_URL}/api/forecasting/forecast`, {
        product_id: productId,
        days_ahead: daysAhead,
      });
      return response.data;
    } catch (error) {
      console.error('AI Service Error:', error);
      throw error;
    }
  }

  async detectAnomaly(actualConsumption: number, expectedConsumption: number, productId: string) {
    try {
      const response = await axios.post(`${AI_SERVICE_URL}/api/anomaly/detect`, {
        actual_consumption: actualConsumption,
        expected_consumption: expectedConsumption,
        product_id: productId,
      });
      return response.data;
    } catch (error) {
      console.error('AI Service Error:', error);
      throw error;
    }
  }

  async getDailyReport(branchId?: string) {
    try {
      const response = await axios.get(`${AI_SERVICE_URL}/api/analytics/daily-report`, {
        params: { branch_id: branchId },
      });
      return response.data;
    } catch (error) {
      console.error('AI Service Error:', error);
      throw error;
    }
  }

  async getBranchesPerformance() {
    try {
      const response = await axios.get(`${AI_SERVICE_URL}/api/analytics/branches-performance`);
      return response.data;
    } catch (error) {
      console.error('AI Service Error:', error);
      throw error;
    }
  }
}

export default new AIService();
