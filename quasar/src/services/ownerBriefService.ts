import {
    normalizeOwnerRichInfo,
    type OwnerRichInfo,
} from 'src/utils/ownerRichView';

type UserBriefPayload = {
    users?: Array<{
        mid?: string | number;
        name?: string;
        face?: string;
        video_count?: number;
    }>;
};

export const fetchUserBriefs = async (
    mids: Array<string | number>
): Promise<OwnerRichInfo[]> => {
    const normalizedMids = Array.from(
        new Set(
            mids
                .map((mid) => String(mid || '').trim())
                .filter(Boolean)
        )
    );

    if (!normalizedMids.length) {
        return [];
    }

    const response = await fetch('/api/user_briefs', {
        method: 'POST',
        headers: {
            Accept: 'application/json',
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ mids: normalizedMids }),
    });

    if (!response.ok) {
        throw new Error(`Failed to fetch owner briefs: ${response.status}`);
    }

    const payload = (await response.json()) as UserBriefPayload;
    return (payload.users || [])
        .map((owner) =>
            normalizeOwnerRichInfo({
                mid: owner.mid,
                name: owner.name,
                face: owner.face,
                video_count: owner.video_count,
            })
        )
        .filter((owner): owner is OwnerRichInfo => Boolean(owner));
};