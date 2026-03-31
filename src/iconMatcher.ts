import Fuse from 'fuse.js';
import { Icon } from './types.js';

// Core icon pack data - we'll load this from @isoflow/isopacks at runtime
// For now, define a subset of common icons for testing
const DEFAULT_ICONS: Icon[] = [
  // Isoflow core icons
  { id: 'server', name: 'Server', url: '/icons/server.svg', collection: 'isoflow' },
  { id: 'database', name: 'Database', url: '/icons/database.svg', collection: 'isoflow' },
  { id: 'cloud', name: 'Cloud', url: '/icons/cloud.svg', collection: 'isoflow' },
  { id: 'client', name: 'Client', url: '/icons/client.svg', collection: 'isoflow' },
  { id: 'user', name: 'User', url: '/icons/user.svg', collection: 'isoflow' },
  { id: 'mobile', name: 'Mobile', url: '/icons/mobile.svg', collection: 'isoflow' },
  { id: 'laptop', name: 'Laptop', url: '/icons/laptop.svg', collection: 'isoflow' },
  { id: 'tablet', name: 'Tablet', url: '/icons/tablet.svg', collection: 'isoflow' },
  { id: 'desktop', name: 'Desktop', url: '/icons/desktop.svg', collection: 'isoflow' },
  { id: 'router', name: 'Router', url: '/icons/router.svg', collection: 'isoflow' },
  { id: 'switch', name: 'Switch', url: '/icons/switch.svg', collection: 'isoflow' },
  { id: 'firewall', name: 'Firewall', url: '/icons/firewall.svg', collection: 'isoflow' },
  { id: 'load-balancer', name: 'Load Balancer', url: '/icons/load-balancer.svg', collection: 'isoflow' },
  { id: 'queue', name: 'Queue', url: '/icons/queue.svg', collection: 'isoflow' },
  { id: 'cache', name: 'Cache', url: '/icons/cache.svg', collection: 'isoflow' },
  { id: 'cdn', name: 'CDN', url: '/icons/cdn.svg', collection: 'isoflow' },
  { id: 'api-gateway', name: 'API Gateway', url: '/icons/api-gateway.svg', collection: 'isoflow' },
  { id: 'function', name: 'Function', url: '/icons/function.svg', collection: 'isoflow' },
  { id: 'container', name: 'Container', url: '/icons/container.svg', collection: 'isoflow' },
  { id: 'kubernetes', name: 'Kubernetes', url: '/icons/kubernetes.svg', collection: 'isoflow' },
  { id: 'docker', name: 'Docker', url: '/icons/docker.svg', collection: 'isoflow' },
  // AWS icons
  { id: 'aws-lambda', name: 'AWS Lambda', url: '/icons/aws/lambda.svg', collection: 'aws' },
  { id: 'aws-api-gateway', name: 'AWS API Gateway', url: '/icons/aws/api-gateway.svg', collection: 'aws' },
  { id: 'aws-s3', name: 'AWS S3', url: '/icons/aws/s3.svg', collection: 'aws' },
  { id: 'aws-dynamodb', name: 'AWS DynamoDB', url: '/icons/aws/dynamodb.svg', collection: 'aws' },
  { id: 'aws-rds', name: 'AWS RDS', url: '/icons/aws/rds.svg', collection: 'aws' },
  { id: 'aws-ec2', name: 'AWS EC2', url: '/icons/aws/ec2.svg', collection: 'aws' },
  { id: 'aws-ecs', name: 'AWS ECS', url: '/icons/aws/ecs.svg', collection: 'aws' },
  { id: 'aws-eks', name: 'AWS EKS', url: '/icons/aws/eks.svg', collection: 'aws' },
  { id: 'aws-sqs', name: 'AWS SQS', url: '/icons/aws/sqs.svg', collection: 'aws' },
  { id: 'aws-sns', name: 'AWS SNS', url: '/icons/aws/sns.svg', collection: 'aws' },
  { id: 'aws-cognito', name: 'AWS Cognito', url: '/icons/aws/cognito.svg', collection: 'aws' },
  { id: 'aws-cloudfront', name: 'AWS CloudFront', url: '/icons/aws/cloudfront.svg', collection: 'aws' },
  { id: 'aws-elb', name: 'AWS ELB', url: '/icons/aws/elb.svg', collection: 'aws' },
  { id: 'aws-vpc', name: 'AWS VPC', url: '/icons/aws/vpc.svg', collection: 'aws' },
  // GCP icons
  { id: 'gcp-cloud-functions', name: 'GCP Cloud Functions', url: '/icons/gcp/cloud-functions.svg', collection: 'gcp' },
  { id: 'gcp-cloud-run', name: 'GCP Cloud Run', url: '/icons/gcp/cloud-run.svg', collection: 'gcp' },
  { id: 'gcp-bigquery', name: 'GCP BigQuery', url: '/icons/gcp/bigquery.svg', collection: 'gcp' },
  { id: 'gcp-cloud-storage', name: 'GCP Cloud Storage', url: '/icons/gcp/cloud-storage.svg', collection: 'gcp' },
  { id: 'gcp-cloud-sql', name: 'GCP Cloud SQL', url: '/icons/gcp/cloud-sql.svg', collection: 'gcp' },
  { id: 'gcp-gke', name: 'GCP GKE', url: '/icons/gcp/gke.svg', collection: 'gcp' },
  { id: 'gcp-pubsub', name: 'GCP Pub/Sub', url: '/icons/gcp/pubsub.svg', collection: 'gcp' },
];

let iconCatalog: Icon[] = DEFAULT_ICONS;
let fuseIndex: Fuse<Icon> | null = null;

export function initializeIconCatalog(icons: Icon[]): void {
  iconCatalog = [...DEFAULT_ICONS, ...icons];
  fuseIndex = new Fuse(iconCatalog, {
    keys: ['name', 'id', 'collection'],
    threshold: 0.4,
    includeScore: true,
  });
}

export function getIconCatalog(): Icon[] {
  return iconCatalog;
}

export function findIconByExactId(id: string): Icon | undefined {
  return iconCatalog.find(icon => icon.id === id);
}

export function matchIcon(query: string): Icon | null {
  if (!fuseIndex) {
    fuseIndex = new Fuse(iconCatalog, {
      keys: ['name', 'id', 'collection'],
      threshold: 0.4,
      includeScore: true,
    });
  }

  // Normalize query
  const normalizedQuery = query.toLowerCase().trim();

  // Try exact ID match first
  const exactMatch = iconCatalog.find(
    icon => icon.id.toLowerCase() === normalizedQuery ||
            icon.id.toLowerCase().replace(/-/g, ' ') === normalizedQuery ||
            icon.id.toLowerCase().replace(/-/g, '') === normalizedQuery.replace(/\s/g, '')
  );
  if (exactMatch) return exactMatch;

  // Try exact name match
  const nameMatch = iconCatalog.find(
    icon => icon.name.toLowerCase() === normalizedQuery
  );
  if (nameMatch) return nameMatch;

  // Fuzzy search
  const results = fuseIndex.search(query);
  if (results.length > 0 && results[0].score !== undefined && results[0].score < 0.5) {
    return results[0].item;
  }

  return null;
}

export function searchIcons(query: string, limit: number = 10): Icon[] {
  if (!fuseIndex) {
    fuseIndex = new Fuse(iconCatalog, {
      keys: ['name', 'id', 'collection'],
      threshold: 0.4,
      includeScore: true,
    });
  }

  const results = fuseIndex.search(query, { limit });
  return results.map(r => r.item);
}
