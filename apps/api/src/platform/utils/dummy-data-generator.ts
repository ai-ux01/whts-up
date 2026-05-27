import { LeadStatus, MessageSender, PrismaClient } from '@prisma/client';

export interface VerticalConfig {
  aiSystemPrompt: string;
  instagramUsername: string;
  contacts: Array<{
    phone: string;
    name: string;
    leadSource: string;
    utmSource: string;
    utmMedium?: string;
    utmCampaign?: string;
    lead: {
      status: LeadStatus;
      tags: string[];
      notes: string;
    };
    messages: Array<{
      sender: MessageSender;
      content: string;
      minutesOffset: number; // minutes ago
    }>;
  }>;
  campaigns: Array<{
    name: string;
    templateName: string;
    status: 'COMPLETED' | 'DRAFT';
    recipients: Array<{
      phone: string;
      name: string;
      status: 'SENT' | 'DELIVERED' | 'PENDING';
    }>;
  }>;
}

export const VERTICAL_CONFIGS: Record<string, VerticalConfig> = {
  REAL_ESTATE: {
    instagramUsername: 'skyline_luxury_living',
    aiSystemPrompt: 'You are a premium real estate sales assistant for Skyline Luxury Living. Respond politely, helpfully, and in a professional tone. Assist clients with inquiries about available residential properties. Premium apartments include: 2BHK starting at ₹1.2 Cr, 3BHK starting at ₹1.8 Cr, and penthouses starting at ₹3.5 Cr. Always ask for their budget, preferred location (e.g. Bandra, Andheri), and offer to schedule a site visit this coming Sunday with our senior consultant.',
    contacts: [
      {
        phone: '+919999123456',
        name: 'Rohan Sharma',
        leadSource: 'meta_ads',
        utmSource: 'meta',
        utmMedium: 'cpc',
        utmCampaign: 'monsoon_luxury_living',
        lead: {
          status: LeadStatus.INTERESTED,
          tags: ['Bandra', '3BHK', 'High-Intent'],
          notes: 'Clicked Click-to-WhatsApp ad. Enquired about 3BHK luxury options. Has a budget of ₹2.0 Cr. Confirmed site visit schedule for Sunday morning.'
        },
        messages: [
          {
            sender: MessageSender.CONTACT,
            content: 'Hi, I saw your ad for luxury 3BHK apartments in Bandra. Can I get details?',
            minutesOffset: 120
          },
          {
            sender: MessageSender.AI,
            content: 'Hello Rohan! Thank you for reaching out to Skyline Luxury Living. We have luxury 3BHK options starting at ₹1.8 Cr in prime Bandra locations. What budget range are you looking at?',
            minutesOffset: 119
          },
          {
            sender: MessageSender.CONTACT,
            content: 'My budget is around 2 Cr. Is a site visit possible this weekend?',
            minutesOffset: 110
          },
          {
            sender: MessageSender.AI,
            content: 'Excellent, we have exactly what you need. Yes, we can arrange an exclusive site visit this Sunday at 11 AM. May I know if morning or afternoon works better for you?',
            minutesOffset: 108
          },
          {
            sender: MessageSender.CONTACT,
            content: 'Morning works fine. Please book it.',
            minutesOffset: 100
          }
        ]
      },
      {
        phone: '+919876543210',
        name: 'Anjali Gupta',
        leadSource: 'google_ads',
        utmSource: 'google',
        utmMedium: 'cpc',
        utmCampaign: 'villa_projects_navi_mumbai',
        lead: {
          status: LeadStatus.NEW,
          tags: ['Villa', 'Navi_Mumbai'],
          notes: 'Landed from Google Search. Looking for a spacious duplex villa. Needs a digital brochure and price catalog.'
        },
        messages: [
          {
            sender: MessageSender.CONTACT,
            content: 'Hi, I saw your new villa projects in Navi Mumbai. Do you have a brochure?',
            minutesOffset: 45
          },
          {
            sender: MessageSender.AI,
            content: 'Hello Anjali! Yes, we have exquisite 4BHK duplex villas in Navi Mumbai with private gardens. Let me share the digital brochure right away. Are you looking for self-use or investment?',
            minutesOffset: 44
          }
        ]
      },
      {
        phone: '+919666112233',
        name: 'Amit Verma',
        leadSource: 'meta_organic',
        utmSource: 'meta',
        utmMedium: 'social',
        utmCampaign: 'instagram_page_dm',
        lead: {
          status: LeadStatus.FOLLOW_UP,
          tags: ['2BHK', 'Booking_Stage'],
          notes: 'Follow up to finalize booking amount for 2BHK. Requested flexi payment schedule. Scheduled phone call today at 3 PM.'
        },
        messages: [
          {
            sender: MessageSender.CONTACT,
            content: 'Is the payment structure flexible for the 2BHK units?',
            minutesOffset: 240
          },
          {
            sender: MessageSender.AGENT,
            content: 'Hi Amit, yes we have an active 10:90 subvention plan available for early buyers. Shall we discuss this on a quick call?',
            minutesOffset: 200
          },
          {
            sender: MessageSender.CONTACT,
            content: 'Yes, please call me around 3 PM today.',
            minutesOffset: 180
          }
        ]
      },
      {
        phone: '+919777556677',
        name: 'Karan Johar',
        leadSource: 'whatsapp',
        utmSource: 'whatsapp',
        utmMedium: 'organic',
        lead: {
          status: LeadStatus.CLOSED,
          tags: ['Penthouse', 'Deal_Closed'],
          notes: 'Successfully closed deal for 3BHK penthouse! Token booking amount transferred. Receipt sent.'
        },
        messages: [
          {
            sender: MessageSender.CONTACT,
            content: 'Hi, token amount is transferred. Please share the receipt.',
            minutesOffset: 1440
          },
          {
            sender: MessageSender.AGENT,
            content: 'Hi Karan, receipt has been generated and sent to your registered email. Congratulations on your premium new home!',
            minutesOffset: 1400
          }
        ]
      }
    ],
    campaigns: [
      {
        name: 'Monsoon Luxury Launch',
        templateName: 'monsoon_luxury',
        status: 'COMPLETED',
        recipients: [
          { phone: '+919999123456', name: 'Rohan Sharma', status: 'DELIVERED' },
          { phone: '+919876543210', name: 'Anjali Gupta', status: 'DELIVERED' },
          { phone: '+919000111222', name: 'Sanjay Jain', status: 'SENT' },
          { phone: '+919333444555', name: 'Preeti Roy', status: 'DELIVERED' }
        ]
      },
      {
        name: 'Bandra Project Site Visit Invites',
        templateName: 'site_visit_invite',
        status: 'DRAFT',
        recipients: []
      }
    ]
  },
  COACHING: {
    instagramUsername: 'apex_jee_neet_academy',
    aiSystemPrompt: 'You are a supportive student counselor for Apex Academy (India\'s premier JEE & NEET training institute). Respond in a warm, welcoming, and encouraging tone. Provide details about our 1-year and 2-year classroom courses. Standard fee is ₹1,50,000/year. Ask about their current class (10th, 11th, 12th, or repeater) and offer to register them for our Free Admission Scholarship Test (ASAT) which happens every Sunday.',
    contacts: [
      {
        phone: '+919999234567',
        name: 'Aditya Vardhan',
        leadSource: 'meta_ads',
        utmSource: 'meta',
        utmMedium: 'cpc',
        utmCampaign: 'jee_classroom_2027',
        lead: {
          status: LeadStatus.INTERESTED,
          tags: ['11th_Class', 'JEE', 'Scholarship'],
          notes: 'Completed 10th and moving to 11th. Interested in 2-year JEE coaching. Enquired about fee waiver. Registered for Sunday ASAT test.'
        },
        messages: [
          {
            sender: MessageSender.CONTACT,
            content: 'Hi, I want details about the JEE 2 years classroom course.',
            minutesOffset: 180
          },
          {
            sender: MessageSender.AI,
            content: 'Hi Aditya! Congratulations on completing 10th. Our 2-Year JEE Classroom Course starts in June. It includes daily lectures, comprehensive modules, and mock tests. Would you like to check our scholarship criteria?',
            minutesOffset: 179
          },
          {
            sender: MessageSender.CONTACT,
            content: 'Yes, when is the scholarship test?',
            minutesOffset: 160
          },
          {
            sender: MessageSender.AI,
            content: 'Great! The Next Scholarship Admission Test (ASAT) is scheduled for this Sunday at 10 AM. It can cover up to 90% of your tuition fees based on score. Shall I register a seat for you?',
            minutesOffset: 158
          },
          {
            sender: MessageSender.CONTACT,
            content: 'Yes, please register me.',
            minutesOffset: 150
          }
        ]
      },
      {
        phone: '+919876123456',
        name: 'Kirti Sen',
        leadSource: 'google_ads',
        utmSource: 'google',
        utmMedium: 'cpc',
        utmCampaign: 'neet_crash_course',
        lead: {
          status: LeadStatus.NEW,
          tags: ['NEET', 'Crash_Course'],
          notes: 'Parent enquired about intensive 45-day NEET crash course starting this month. Needs fee plan.'
        },
        messages: [
          {
            sender: MessageSender.CONTACT,
            content: 'Hello, is the NEET crash course starting this week?',
            minutesOffset: 50
          },
          {
            sender: MessageSender.AI,
            content: 'Hello Kirti! Yes, our intensive NEET Crash Course starts on Monday. It is a 45-day course with daily practice papers and doubts sessions. Let me share the fee structure and daily schedule.',
            minutesOffset: 49
          }
        ]
      },
      {
        phone: '+919555112233',
        name: 'Rakesh Patel (Parent)',
        leadSource: 'whatsapp',
        utmSource: 'whatsapp',
        utmMedium: 'organic',
        lead: {
          status: LeadStatus.FOLLOW_UP,
          tags: ['NEET', 'Fee_Issue'],
          notes: 'Requested grace extension for payment of first installment of NEET course fees due to bank transfer limit. Granted extension.'
        },
        messages: [
          {
            sender: MessageSender.CONTACT,
            content: 'Can we pay the first installment next Wednesday instead of today?',
            minutesOffset: 360
          },
          {
            sender: MessageSender.AGENT,
            content: 'Hello Mr. Patel, I have checked with the accounts team and approved a grace extension for you until next Wednesday. Let me know if you face any issues.',
            minutesOffset: 300
          }
        ]
      }
    ],
    campaigns: [
      {
        name: 'JEE Scholarship Test (ASAT)',
        templateName: 'asat_registration',
        status: 'COMPLETED',
        recipients: [
          { phone: '+919999234567', name: 'Aditya Vardhan', status: 'DELIVERED' },
          { phone: '+919876123456', name: 'Kirti Sen', status: 'SENT' },
          { phone: '+919111222333', name: 'Manish Kumar', status: 'DELIVERED' }
        ]
      },
      {
        name: 'New NEET Batch Commencing',
        templateName: 'batch_start_notice',
        status: 'DRAFT',
        recipients: []
      }
    ]
  },
  CLINIC: {
    instagramUsername: 'wellcare_clinic_care',
    aiSystemPrompt: 'You are a warm and patient clinical receptionist for WellCare Multi-specialty Clinic. Help patients book doctor appointments and check timings. Doctors: Dr. Malhotra (Pediatrician, Mon-Sat 10 AM - 2 PM), Dr. Seth (Dermatologist, Tue-Fri 4 PM - 8 PM). Consultation fee is ₹800. STRICTLY do not give any medical advice or diagnose symptoms. If the patient inquires about serious symptoms, politely ask them to visit the clinic immediately to consult our expert doctor.',
    contacts: [
      {
        phone: '+919999345678',
        name: 'Meera Krishnan',
        leadSource: 'google_ads',
        utmSource: 'google',
        utmMedium: 'cpc',
        utmCampaign: 'dermatologist_south_delhi',
        lead: {
          status: LeadStatus.INTERESTED,
          tags: ['Dermatology', 'Appointment'],
          notes: 'Patient looking for dermatologist appointment on Saturday for severe acne. Confirmed booking for Saturday 11:30 AM.'
        },
        messages: [
          {
            sender: MessageSender.CONTACT,
            content: 'Hi, can I book an appointment with the dermatologist for Saturday morning?',
            minutesOffset: 150
          },
          {
            sender: MessageSender.AI,
            content: 'Hello Meera! Yes, Dr. Seth, our chief dermatologist, is available on Tue-Fri from 4 PM to 8 PM, and special Saturday slots from 10 AM to 1 PM. Would you like to book a Saturday 11:30 AM slot?',
            minutesOffset: 149
          },
          {
            sender: MessageSender.CONTACT,
            content: 'Yes, 11:30 AM on Saturday works fine. What are the consultation charges?',
            minutesOffset: 140
          },
          {
            sender: MessageSender.AI,
            content: 'Perfect, I have booked Saturday at 11:30 AM for your consultation. The clinic consultation fee is ₹800. Please arrive 10 minutes prior to register.',
            minutesOffset: 138
          },
          {
            sender: MessageSender.CONTACT,
            content: 'Great, thanks! Will be there.',
            minutesOffset: 130
          }
        ]
      },
      {
        phone: '+919876234567',
        name: 'Sanjay Kapoor',
        leadSource: 'whatsapp',
        utmSource: 'whatsapp',
        utmMedium: 'organic',
        lead: {
          status: LeadStatus.NEW,
          tags: ['Pediatrics', 'Vaccination'],
          notes: 'Enquired about Dr. Malhotra (pediatrician) for child vaccination timings today.'
        },
        messages: [
          {
            sender: MessageSender.CONTACT,
            content: 'Hello, is pediatrician Dr. Malhotra available at the clinic today?',
            minutesOffset: 60
          },
          {
            sender: MessageSender.AI,
            content: 'Hello Sanjay! Yes, Dr. Malhotra is here until 2 PM today. We have a couple of open slots between 12:30 PM and 1:30 PM. Would you like us to put you in the queue?',
            minutesOffset: 59
          }
        ]
      }
    ],
    campaigns: [
      {
        name: 'Free Dental Health Checkup Camp',
        templateName: 'dental_camp_info',
        status: 'COMPLETED',
        recipients: [
          { phone: '+919999345678', name: 'Meera Krishnan', status: 'DELIVERED' },
          { phone: '+919876234567', name: 'Sanjay Kapoor', status: 'DELIVERED' },
          { phone: '+919222333444', name: 'Rajesh Gupta', status: 'SENT' }
        ]
      },
      {
        name: 'Flu Vaccine Reminder',
        templateName: 'flu_vaccine_remind',
        status: 'DRAFT',
        recipients: []
      }
    ]
  },
  SOLAR: {
    instagramUsername: 'luminous_solar_power',
    aiSystemPrompt: 'You are an expert solar energy consultant for Luminous Solar. Educate property owners on the benefits of switching to solar power. Explain that a standard 5kW residential system costs ~₹2.5 Lakhs (before subsidy) and slashes electricity bills by up to 80%, saving ~₹5,000/month. Mention the 40% central government rooftop subsidy. Always ask for their monthly electricity bill, average roof size, and offer to schedule a free technical site audit by our rooftop engineers.',
    contacts: [
      {
        phone: '+919999456789',
        name: 'Devendra Sharma',
        leadSource: 'meta_ads',
        utmSource: 'meta',
        utmMedium: 'cpc',
        utmCampaign: 'solar_rooftop_subsidy',
        lead: {
          status: LeadStatus.INTERESTED,
          tags: ['Noida', '5kW_System', 'Subsidy'],
          notes: 'Homeowner in Noida. Summer bill around ₹9,000. Rooftop space is 600 sq ft. Site audit scheduled for tomorrow at 4 PM.'
        },
        messages: [
          {
            sender: MessageSender.CONTACT,
            content: 'Hi, what is the cost of a 5kW solar panel with government subsidy?',
            minutesOffset: 200
          },
          {
            sender: MessageSender.AI,
            content: 'Hello Devendra! A premium 5kW solar system costs around ₹2.5 Lakhs. With the active 40% government subsidy, your net cost would be around ₹1.5 Lakhs. May I ask what your average monthly electricity bill is?',
            minutesOffset: 199
          },
          {
            sender: MessageSender.CONTACT,
            content: 'My summer bill is around ₹8,000 to ₹10,000. Is my roof space enough?',
            minutesOffset: 190
          },
          {
            sender: MessageSender.AI,
            content: 'A 5kW system needs around 500 sq ft of shadow-free rooftop space and will easily slash your bill by up to 80%! I\'d recommend booking a free technical site audit. Can our engineer visit your roof tomorrow at 4 PM?',
            minutesOffset: 188
          },
          {
            sender: MessageSender.CONTACT,
            content: 'Yes, that works. Noida Sector 62 is the location.',
            minutesOffset: 180
          }
        ]
      },
      {
        phone: '+919876345678',
        name: 'Rajesh Goel',
        leadSource: 'google_ads',
        utmSource: 'google',
        utmMedium: 'cpc',
        utmCampaign: 'commercial_solar_power',
        lead: {
          status: LeadStatus.NEW,
          tags: ['Commercial', '50kW'],
          notes: 'Factory owner looking for 50kW industrial system. Monthly bill is ₹1.5 Lakh. Needs physical site review.'
        },
        messages: [
          {
            sender: MessageSender.CONTACT,
            content: 'Hello, looking for solar panels for our packaging unit in Faridabad. Bill is 1.5 Lakhs per month.',
            minutesOffset: 80
          },
          {
            sender: MessageSender.AI,
            content: 'Hello Mr. Goel! We specialize in high-efficiency industrial solar systems. A 50kW system would be ideal for a ₹1.5 Lakh bill. Let me connect you with our lead industrial consultant right away.',
            minutesOffset: 79
          }
        ]
      }
    ],
    campaigns: [
      {
        name: 'Subsidy Scheme Update 2026',
        templateName: 'subsidy_alert_2026',
        status: 'COMPLETED',
        recipients: [
          { phone: '+919999456789', name: 'Devendra Sharma', status: 'DELIVERED' },
          { phone: '+919876345678', name: 'Rajesh Goel', status: 'DELIVERED' },
          { phone: '+919444555666', name: 'Sunil Mehta', status: 'SENT' }
        ]
      },
      {
        name: 'Commercial Site Audits Schedule',
        templateName: 'commercial_solar_audit',
        status: 'DRAFT',
        recipients: []
      }
    ]
  },
  CAR_DEALERSHIP: {
    instagramUsername: 'apex_motors_cars',
    aiSystemPrompt: 'You are a dynamic sales assistant for Apex Motors. Provide information on our popular vehicles: SUV (Apex Cruiser starting at ₹18 Lakhs), and EV (Apex Volt starting at ₹15 Lakhs). Offer exchange bonuses up to ₹50,000, attractive 7.9% financing schemes, and quick bookings. Ask which vehicle model they are interested in and offer to schedule a test drive at their home or our nearest showroom.',
    contacts: [
      {
        phone: '+919999567890',
        name: 'Rajiv Verma',
        leadSource: 'meta_ads',
        utmSource: 'meta',
        utmMedium: 'cpc',
        utmCampaign: 'apex_cruiser_suv',
        lead: {
          status: LeadStatus.INTERESTED,
          tags: ['SUV', 'Cruiser', 'Test_Drive'],
          notes: 'Enquired about Cruiser waiting period in Delhi. Wants SUV diesel automatic variant. Scheduled home test drive tomorrow 3 PM.'
        },
        messages: [
          {
            sender: MessageSender.CONTACT,
            content: 'Hi, what is the waiting period for Apex Cruiser SUV in Delhi?',
            minutesOffset: 120
          },
          {
            sender: MessageSender.AI,
            content: 'Hello Rajiv! The premium Apex Cruiser has a 4-to-6 week waiting period depending on the variant. We have a diesel automatic model available at our showroom. Would you like to book a test drive?',
            minutesOffset: 119
          },
          {
            sender: MessageSender.CONTACT,
            content: 'Can you arrange a home test drive for tomorrow afternoon?',
            minutesOffset: 105
          },
          {
            sender: MessageSender.AI,
            content: 'Certainly! I can schedule our representative to bring the vehicle to your home tomorrow at 3 PM. Could you please share your residential address and pin code?',
            minutesOffset: 103
          },
          {
            sender: MessageSender.CONTACT,
            content: 'GK-2, New Delhi, 110048.',
            minutesOffset: 95
          }
        ]
      },
      {
        phone: '+919876456789',
        name: 'Ananya Sen',
        leadSource: 'google_ads',
        utmSource: 'google',
        utmMedium: 'cpc',
        utmCampaign: 'apex_volt_ev_deals',
        lead: {
          status: LeadStatus.NEW,
          tags: ['EV', 'Finance', 'Exchange'],
          notes: 'Interested in EV finance options, road tax waivers and exchange bonus structure for hatchback.'
        },
        messages: [
          {
            sender: MessageSender.CONTACT,
            content: 'Hi, does the Apex Volt EV qualify for road tax benefits? What is the exchange bonus?',
            minutesOffset: 70
          },
          {
            sender: MessageSender.AI,
            content: 'Hello Ananya! Yes, under the state EV policy, you get 100% road tax waiver and income tax benefits under Sec 80EEB! Plus, we have an active ₹50,000 exchange bonus. Which car do you currently drive?',
            minutesOffset: 69
          }
        ]
      }
    ],
    campaigns: [
      {
        name: 'Year-End Exchange Carnival',
        templateName: 'exchange_carnival',
        status: 'COMPLETED',
        recipients: [
          { phone: '+919999567890', name: 'Rajiv Verma', status: 'DELIVERED' },
          { phone: '+919876456789', name: 'Ananya Sen', status: 'DELIVERED' },
          { phone: '+919555666777', name: 'Deepak Chopra', status: 'SENT' }
        ]
      },
      {
        name: 'SUV Test Drive Invitation',
        templateName: 'suv_test_drive',
        status: 'DRAFT',
        recipients: []
      }
    ]
  }
};

/** Dummy marketing values to populate in the workspace. */
export function getRandomMarketingData(verticalKey: string) {
  const accountId = 'act_' + Math.floor(1000000000000000 + Math.random() * 9000000000000000);
  const pageId = '' + Math.floor(1000000000000000 + Math.random() * 9000000000000000);
  const businessId = '' + Math.floor(1000000000000000 + Math.random() * 9000000000000000);
  const googleId = Math.floor(100 + Math.random() * 900) + '-' + Math.floor(100 + Math.random() * 900) + '-' + Math.floor(1000 + Math.random() * 9000);
  const pixelId = '' + Math.floor(1000000000000000 + Math.random() * 9000000000000000);

  return {
    metaAdsAccountId: accountId,
    metaPageId: pageId,
    metaBusinessId: businessId,
    googleAdsCustomerId: googleId,
    facebookPixelId: pixelId,
    defaultUtmSource: 'whatsapp',
    whatsappPhoneNumberId: '1083340831535489',
    whatsappAccessToken: 'dummy_token_value',
  };
}

export async function generateDummyData(
  prisma: PrismaClient,
  workspaceId: string,
  businessType: string
) {
  const config = VERTICAL_CONFIGS[businessType];
  if (!config) return;

  // Let's seed contacts and leads!
  for (let i = 0; i < config.contacts.length; i++) {
    const c = config.contacts[i];
    const contact = await prisma.contact.create({
      data: {
        workspaceId,
        phone: c.phone,
        name: c.name,
        leadSource: c.leadSource,
        utmSource: c.utmSource,
        utmMedium: c.utmMedium || null,
        utmCampaign: c.utmCampaign || null,
      },
    });

    const conversation = await prisma.conversation.create({
      data: {
        workspaceId,
        contactId: contact.id,
        unreadCount: c.lead.status === LeadStatus.CLOSED ? 0 : 1,
        lastMessageAt: new Date(Date.now() - c.messages[c.messages.length - 1].minutesOffset * 60 * 1000),
        lastSender: c.messages[c.messages.length - 1].sender,
      },
    });

    // Seed messages
    await prisma.message.createMany({
      data: c.messages.map((m) => ({
        conversationId: conversation.id,
        sender: m.sender,
        content: m.content,
        type: 'TEXT',
        createdAt: new Date(Date.now() - m.minutesOffset * 60 * 1000),
      })),
    });

    // Create lead
    await prisma.lead.create({
      data: {
        workspaceId,
        contactId: contact.id,
        status: c.lead.status,
        notes: c.lead.notes,
        tags: c.lead.tags,
        lastInteractionAt: new Date(),
      },
    });
  }

  // Seed campaigns
  for (const camp of config.campaigns) {
    const campaign = await prisma.campaign.create({
      data: {
        workspaceId,
        name: camp.name,
        templateName: camp.templateName,
        status: camp.status,
        startedAt: camp.status === 'COMPLETED' ? new Date(Date.now() - 360 * 60 * 1000) : null,
        completedAt: camp.status === 'COMPLETED' ? new Date(Date.now() - 355 * 60 * 1000) : null,
      },
    });

    if (camp.recipients.length > 0) {
      await prisma.campaignRecipient.createMany({
        data: camp.recipients.map((rec) => ({
          campaignId: campaign.id,
          phone: rec.phone,
          name: rec.name,
          status: rec.status,
          sentAt: rec.status !== 'PENDING' ? new Date(Date.now() - 358 * 60 * 1000) : null,
        })),
      });
    }
  }
}
