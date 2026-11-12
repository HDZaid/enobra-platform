import { catalogLinkPreview } from '../../src/services/catalogLinkPreview.js';

export const onRequestGet = (context) => catalogLinkPreview(context, 'properties');
