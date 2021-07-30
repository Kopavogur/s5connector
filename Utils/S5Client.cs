using Microsoft.Extensions.Configuration;
using S5;
using System;
using System.ServiceModel;
using System.ServiceModel.Description;
using System.Xml;

namespace S5Connector.Utils
{
    public class S5Client
    {
        public IConfiguration Configuration { get; }

        public ChannelFactory<ServiceSoap> Factory { get; set; }

        public ServiceSoap Get
        {
            get
            {
                return Factory.CreateChannel();
            }
        }

        public string User { get; }
        public string Password { get; }

        public S5Client(IConfiguration configuration)
        {
            Configuration = configuration;

            User = Configuration["S5:User"];
            Password = Configuration["S5:Password"];

            BasicHttpBinding binding = new BasicHttpBinding
            {
                SendTimeout = TimeSpan.FromSeconds(100),
                MaxBufferSize = int.MaxValue,
                MaxReceivedMessageSize = int.MaxValue,
                AllowCookies = true,
                ReaderQuotas = XmlDictionaryReaderQuotas.Max
            };
            binding.Security.Mode = BasicHttpSecurityMode.TransportCredentialOnly;
            EndpointAddress address = new EndpointAddress(Configuration["S5:EndPoint"]);
            Factory = new ChannelFactory<ServiceSoap>(binding, address);

            if (!Factory.Endpoint.EndpointBehaviors.TryGetValue(typeof(ClientCredentials), out IEndpointBehavior behaviour))
            {
                throw new Exception("Endpoint, could not obtain ClientCredentials");
            }
            ClientCredentials credentials = (ClientCredentials)behaviour;
            credentials.Windows.ClientCredential.UserName = Configuration["S5:Windows:User"];
            credentials.Windows.ClientCredential.Password = Configuration["S5:Windows:Password"];
            credentials.Windows.ClientCredential.Domain = Configuration["S5:Windows:Domain"];
            credentials.Windows.AllowedImpersonationLevel = System.Security.Principal.TokenImpersonationLevel.Identification;
            binding.Security.Transport.ClientCredentialType = HttpClientCredentialType.Windows;
        }
    }
}
