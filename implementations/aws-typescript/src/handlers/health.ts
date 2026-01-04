import type { APIGatewayProxyEventV2, APIGatewayProxyResultV2, HealthResponse } from '../types';

const VERSION = '1.0.0';
const IMPLEMENTATION = 'aws-typescript';

export async function handler(
  _event: APIGatewayProxyEventV2
): Promise<APIGatewayProxyResultV2> {
  const response: HealthResponse = {
    status: 'healthy',
    version: VERSION,
    implementation: IMPLEMENTATION,
  };

  return {
    statusCode: 200,
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(response),
  };
}
